/*
 * SaudiCord Windows installer helper
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

function fail(message) { console.error("SaudiCord: " + message); process.exit(1); }
function guarded(fn) {
    try { fn(); }
    catch (e) {
        if (["EPERM", "EBUSY", "EACCES"].includes(e.code))
            fail("أغلق Discord بالكامل ثم أعد المحاولة. (" + e.code + ")");
        throw e;
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
const RESOURCES = resolveResources();
const APP = join(RESOURCES, "app.asar");
const BACKUP = join(RESOURCES, "_app.asar");
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

if (uninstall) {
    if (!isOurs()) fail("التثبيت الحالي ليس SaudiCord؛ لم يتم تغيير أي ملف.");
    if (!existsSync(BACKUP)) fail("النسخة الأصلية مفقودة؛ أوقفت الإزالة لحماية Discord.");
    guarded(() => {
        rmSync(APP, { recursive: true, force: true });
        renameSync(BACKUP, APP);
    });
    if (existsSync(PAYLOAD)) rmSync(PAYLOAD, { force: true });
    if (existsSync(PAYLOAD_DIR) && readdirSync(PAYLOAD_DIR).length === 0) rmSync(PAYLOAD_DIR);
    console.log("تمت إزالة SaudiCord واستعادة Discord الأصلي.");
    process.exit(0);
}

if (!existsSync(PAYLOAD_SOURCE)) fail("ملف SaudiCord غير موجود بجانب المثبّت.");
if (existsSync(BACKUP) && !isOurs())
    fail("يوجد تعديل آخر على Discord. لم يتم استبداله؛ أزله أولاً.");
mkdirSync(PAYLOAD_DIR, { recursive: true });
copyFileSync(PAYLOAD_SOURCE, PAYLOAD);
const indexJs = `// SaudiCord bridge
require(${JSON.stringify(PAYLOAD)});
`;
const packageJson = JSON.stringify({
    name: "discord",
    main: "index.js",
    [MARKER]: { installedAt: new Date().toISOString() }
}, null, 2);
const bridge = packAsar({ "package.json": packageJson, "index.js": indexJs });
if (!existsSync(BACKUP)) {
    guarded(() => {
        renameSync(APP, BACKUP);
        try { writeFileSync(APP, bridge); }
        catch (e) { renameSync(BACKUP, APP); throw e; }
    });
} else {
    guarded(() => {
        const temp = join(RESOURCES, "app.saudicord.tmp");
        writeFileSync(temp, bridge);
        rmSync(APP, { recursive: true, force: true });
        renameSync(temp, APP);
    });
}
console.log("تم تثبيت SaudiCord على Discord " + branch.toUpperCase() + ". أعد تشغيل Discord.");
