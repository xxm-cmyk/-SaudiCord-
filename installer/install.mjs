/*
 * SaudiCord Windows installer helper
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import {
    copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync,
    renameSync, rmSync, statSync, writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { packAsar, readAsarFile } from "./asar.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PAYLOAD_SOURCE = join(ROOT, "saudicord.asar");
const MARKER = "saudicord";
const BRANCHES = { stable: "Discord", ptb: "DiscordPTB", canary: "DiscordCanary" };
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf("--" + name); return i < 0 ? undefined : args[i + 1]; };
const uninstall = args.includes("--uninstall");
const branch = flag("branch") ?? "stable";
const local = process.env.LOCALAPPDATA;
const roaming = process.env.APPDATA ?? process.env.HOME;
const PAYLOAD_DIR = join(roaming, "SaudiCord");
const PAYLOAD = join(PAYLOAD_DIR, "saudicord.asar");
const argsLog = join(PAYLOAD_DIR, "installer.log");

function fail(message) {
    try {
        mkdirSync(PAYLOAD_DIR, { recursive: true });
        writeFileSync(argsLog, message + "\n", "utf8");
    } catch {}
    console.error("SaudiCord: " + message);
    process.exit(1);
}
function guarded(fn, target = "ملف Discord") {
    try { fn(); }
    catch (e) {
        if (["EPERM", "EBUSY", "EACCES"].includes(e.code))
            fail("تعذّر تعديل " + target + " لأن Windows يمنع الوصول إليه (" + e.code + "). أغلق Discord من شريط النظام، ثم أعد المحاولة.\nالتفاصيل: " + (e.message ?? e));
        throw e;
    }
}
function assertDiscordClosed() {
    if (process.platform !== "win32") return;
    let output = "";
    try { output = execFileSync("tasklist", ["/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true }); }
    catch { return; }
    const running = output.split(/\r?\n/).filter(line =>
        /^(?:"?Discord(?:PTB|Canary)?\.exe"?),/i.test(line)
    );
    if (running.length) {
        const names = [...new Set(running.map(line => line.split(",")[0].replaceAll('"', "")))];
        fail("لا تزال عملية Discord تعمل بالخلفية: " + names.join("، ") + ". أغلقها من إدارة المهام ثم أعد المحاولة.");
    }
}
function latestResources(base) {
    if (!existsSync(base)) return undefined;
    const versions = readdirSync(base)
        .filter(x => x.startsWith("app-"))
        .map(name => ({ name, parts: name.slice(4).split(".").map(Number) }))
        .filter(x => x.parts.length && x.parts.every(Number.isFinite))
        .sort((a, b) => {
            for (let i = 0; i < Math.max(a.parts.length, b.parts.length); i++) {
                const d = (b.parts[i] ?? 0) - (a.parts[i] ?? 0);
                if (d) return d;
            }
            return 0;
        });
    for (const v of versions) {
        const p = join(base, v.name, "resources");
        if (existsSync(join(p, "app.asar"))) return p;
    }
}
function resolveResources() {
    if (process.platform !== "win32" || !local) fail("هذا المثبّت مخصص لنظام Windows.");
    const folder = BRANCHES[branch];
    if (!folder) fail("فرع غير معروف. استخدم stable أو ptb أو canary.");
    const result = latestResources(join(local, folder));
    if (!result) fail("لم يتم العثور على Discord " + branch.toUpperCase() + ". ثبّت Discord أولاً.");
    return result;
}
assertDiscordClosed();
const RESOURCES = resolveResources();
const APP = join(RESOURCES, "app.asar");
const LEGACY_BACKUP = join(RESOURCES, "_app.asar");
const SAUDI_BACKUP = join(RESOURCES, "app.saudicord.original.asar");
function referencesPayload(text) {
    const p = PAYLOAD_DIR;
    return text.includes(p) || text.includes(p.split("\\").join("\\\\"));
}
function isOurs() {
    if (!existsSync(APP)) return false;
    if (statSync(APP).isDirectory()) {
        const index = join(APP, "index.js");
        if (!existsSync(index)) return false;
        try { return referencesPayload(readFileSync(index, "utf8")); } catch { return false; }
    }
    try {
        const pkg = readAsarFile(APP, "package.json");
        if (pkg && JSON.parse(pkg.toString("utf8"))[MARKER]) return true;
    } catch {}
    try {
        const index = readAsarFile(APP, "index.js");
        return !!index && referencesPayload(index.toString("utf8"));
    } catch { return false; }
}
function quarantinePreviousClients() {
    const candidates = [
        ["Vencord", join(roaming, "Vencord")],
        ["BetterDiscord", join(roaming, "BetterDiscord")],
        ["OpenAsar", join(roaming, "OpenAsar")]
    ];
    const found = candidates.filter(([, path]) => existsSync(path));
    if (!found.length) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const destination = join(PAYLOAD_DIR, "previous-clients-backup", stamp);
    mkdirSync(destination, { recursive: true });
    for (const [name, path] of found) {
        const target = join(destination, name);
        guarded(() => renameSync(path, target), name);
        console.log("تم نقل ملفات " + name + " إلى نسخة احتياطية: " + target);
    }
}
if (uninstall) {
    if (!isOurs()) fail("التثبيت الحالي ليس SaudiCord؛ لم يتم تغيير أي ملف.");
    const restoreFrom = existsSync(SAUDI_BACKUP) ? SAUDI_BACKUP : LEGACY_BACKUP;
    if (!existsSync(restoreFrom)) fail("النسخة الأصلية مفقودة؛ أوقفت الإزالة لحماية Discord.");
    guarded(() => {
        rmSync(APP, { recursive: true, force: true });
        renameSync(restoreFrom, APP);
    });
    if (existsSync(PAYLOAD)) rmSync(PAYLOAD, { force: true });
    console.log("تمت إزالة SaudiCord واستعادة Discord. النسخ الاحتياطية للعملاء السابقين محفوظة داخل " + PAYLOAD_DIR);
    process.exit(0);
}
if (!existsSync(PAYLOAD_SOURCE)) fail("ملف SaudiCord غير موجود بجانب المثبّت.");
if (!existsSync(APP)) fail("ملف app.asar غير موجود؛ لم يتم إجراء أي تغيير.");
if (isOurs() && !existsSync(SAUDI_BACKUP) && !existsSync(LEGACY_BACKUP))
    fail("نسخة Discord الأصلية غير موجودة؛ أوقفت التثبيت لحماية الملفات.");
if (existsSync(SAUDI_BACKUP) && !isOurs())
    fail("وجدت نسخة احتياطية سابقة لـ SaudiCord لكن app.asar ليس تابعاً له. لم يتم تغيير أي ملف.");
mkdirSync(PAYLOAD_DIR, { recursive: true });
quarantinePreviousClients();
copyFileSync(PAYLOAD_SOURCE, PAYLOAD);
if (!existsSync(SAUDI_BACKUP)) {
    // A legacy _app.asar is commonly the clean copy kept by client-mod installers.
    // Prefer it as the uninstall restore point, while preserving the currently active app.asar.
    const restoreSource = existsSync(LEGACY_BACKUP) ? LEGACY_BACKUP : APP;
    if (restoreSource === APP) {
        copyFileSync(APP, SAUDI_BACKUP);
    } else {
        const quarantineRoot = join(PAYLOAD_DIR, "previous-clients-backup");
        mkdirSync(quarantineRoot, { recursive: true });
        copyFileSync(APP, join(quarantineRoot, "active-app-before-install.asar"));
        copyFileSync(restoreSource, SAUDI_BACKUP);
    }
}
const indexJs = `// SaudiCord bridge
require(${JSON.stringify(PAYLOAD)});
`;
const packageJson = JSON.stringify({
    name: "discord",
    main: "index.js",
    [MARKER]: { installedAt: new Date().toISOString() }
}, null, 2);
const bridge = packAsar({ "package.json": packageJson, "index.js": indexJs });
guarded(() => {
    const temp = join(RESOURCES, "app.saudicord.tmp");
    writeFileSync(temp, bridge);
    if (existsSync(APP)) rmSync(APP, { recursive: true, force: true });
    renameSync(temp, APP);
}, APP);
console.log("تم تثبيت SaudiCord على Discord " + branch.toUpperCase() + ". أعد تشغيل Discord.");
