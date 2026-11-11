/*
 * SaudiCord server membership gate.
 * Blurs and blocks the client until the current account joins the official server.
 * Membership is rechecked continuously so leaving the server restores the gate.
 */
import { SAUDICORD_GUILD_ID } from "@utils/constants";
import { GuildStore } from "@webpack/common";

const INVITE_URL = "https://discord.gg/gbGPpTq6tk";
const ROOT_ID = "saudicord-membership-gate";
const STYLE_ID = "saudicord-membership-gate-style";
const CHECK_INTERVAL = 2_000;

let interval: ReturnType<typeof setInterval> | undefined;
let root: HTMLDivElement | undefined;

function isMember(): boolean {
    try {
        return GuildStore.getGuildIds().includes(SAUDICORD_GUILD_ID);
    } catch (error) {
        console.error("[SaudiCord] Membership check failed:", error);
        return false;
    }
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #${ROOT_ID} {
            position: fixed; inset: 0; z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
            padding: 24px; direction: rtl;
            background: rgba(7,10,18,.48);
            -webkit-backdrop-filter: blur(16px) saturate(125%);
            backdrop-filter: blur(16px) saturate(125%);
            font-family: inherit;
            animation: saudicord-gate-in .22s ease-out both;
        }
        #${ROOT_ID} * { box-sizing: border-box; }
        #${ROOT_ID} .sc-gate-card {
            width: min(440px,100%); padding: 34px 30px 28px;
            color: #f5f7ff; text-align: center;
            border: 1px solid rgba(255,255,255,.13); border-radius: 22px;
            background: linear-gradient(145deg,rgba(26,35,54,.97),rgba(10,14,24,.98));
            box-shadow: 0 28px 90px rgba(0,0,0,.55),inset 0 1px rgba(255,255,255,.08);
        }
        #${ROOT_ID} .sc-gate-mark {
            width: 64px; height: 64px; margin: 0 auto 18px;
            display: grid; place-items: center; border-radius: 20px;
            color: white; background: linear-gradient(145deg,#2388ff,#1452b8);
            box-shadow: 0 10px 30px rgba(35,136,255,.25);
            font-size: 28px; font-weight: 800;
        }
        #${ROOT_ID} h2 { margin: 0; font-size: 22px; font-weight: 800; }
        #${ROOT_ID} .sc-gate-desc {
            margin: 11px 0 24px; color: rgba(235,241,255,.68);
            font-size: 14px; line-height: 1.9;
        }
        #${ROOT_ID} .sc-gate-actions { display: grid; gap: 10px; }
        #${ROOT_ID} button {
            width: 100%; min-height: 46px; border: 0; border-radius: 12px;
            cursor: pointer; font: inherit; font-size: 14px; font-weight: 750;
            transition: transform .15s ease,filter .15s ease;
        }
        #${ROOT_ID} button:hover { filter: brightness(1.1); transform: translateY(-1px); }
        #${ROOT_ID} .sc-gate-join { color: white; background: #247cff; }
        #${ROOT_ID} .sc-gate-check {
            color: #eaf1ff; background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
        }
        #${ROOT_ID} .sc-gate-status {
            min-height: 20px; margin: 15px 0 0;
            color: rgba(235,241,255,.58); font-size: 12px; line-height: 1.6;
        }
        #${ROOT_ID} .sc-gate-foot {
            margin: 14px 0 0; color: rgba(235,241,255,.35); font-size: 11px;
        }
        @keyframes saudicord-gate-in { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
            #${ROOT_ID} { animation: none; }
            #${ROOT_ID} button { transition: none; }
        }
    `;
    document.head.appendChild(style);
}

function showGate() {
    if (root?.isConnected) return;
    ensureStyles();

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "sc-gate-title");

    const card = document.createElement("section");
    card.className = "sc-gate-card";
    card.innerHTML = `
        <div class="sc-gate-mark" aria-hidden="true">S</div>
        <h2 id="sc-gate-title">انضم إلى مجتمع SaudiCord</h2>
        <p class="sc-gate-desc">
            استخدام SaudiCord يتطلب عضوية السيرفر الرسمي.
            انضم للسيرفر، ثم اضغط على زر التحقق للمتابعة.
        </p>
        <div class="sc-gate-actions">
            <button class="sc-gate-join" type="button">الانضمام إلى السيرفر</button>
            <button class="sc-gate-check" type="button">تحقّق من العضوية</button>
        </div>
        <p class="sc-gate-status" aria-live="polite">بانتظار انضمامك إلى السيرفر…</p>
        <p class="sc-gate-foot">ستظهر هذه النافذة مجددًا إذا غادرت السيرفر.</p>
    `;
    root.appendChild(card);
    document.body.appendChild(root);

    card.querySelector<HTMLButtonElement>(".sc-gate-join")!.addEventListener("click", () => {
        window.open(INVITE_URL, "_blank", "noopener,noreferrer");
    });
    card.querySelector<HTMLButtonElement>(".sc-gate-check")!.addEventListener("click", () => {
        const message = card.querySelector<HTMLParagraphElement>(".sc-gate-status")!;
        message.textContent = "جارٍ التحقق من عضويتك…";
        if (isMember()) hideGate();
        else message.textContent = "لم نعثر على عضويتك بعد. تأكد من الانضمام ثم أعد التحقق.";
    });
}

function hideGate() {
    root?.remove();
    root = undefined;
}

export function startSaudiCordGate() {
    if (interval) clearInterval(interval);
    const check = () => {
        if (!document.body) return;
        if (isMember()) hideGate();
        else showGate();
    };
    check();
    interval = setInterval(check, CHECK_INTERVAL);
    document.addEventListener("visibilitychange", check);
}
