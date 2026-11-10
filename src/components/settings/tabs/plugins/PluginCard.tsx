/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { hasAnyVisibleSettings, isHiddenByBisect, isPluginEnabled, pluginRequiresRestart, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { CogWheel, InfoIcon } from "@components/Icons";
import { AddonCard } from "@components/settings/AddonCard";
import { classNameFactory } from "@utils/css";
import { t } from "@utils/esharqI18n";
import { resolvePluginDescription } from "@utils/i18n";
import { Logger } from "@utils/Logger";
import { Plugin } from "@utils/types";
import { React, showToast, Toasts } from "@webpack/common";

import { SAUDICORD_LOGO } from "@components/settings/esharqLogo";
import { PluginMeta } from "~plugins";

import { openPluginModal } from "./PluginModal";

const logger = new Logger("PluginCard");
const cl = classNameFactory("vc-plugins-");
interface PluginCardProps extends React.HTMLProps<HTMLDivElement> {
    plugin: Plugin;
    disabled?: boolean;
    onRestartNeeded(name: string, key: string): void;
    isNew?: boolean;
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

export const FORK_EXCLUSIVE_PLUGINS = new Set([
    "ArabicAutoUpdater",
    // 🔴 محرّك التعريب من SaudiCord، لكنه يسكن `src/plugins/_core/` **بالضرورة**:
    // يجب أن يُستورَد قبل تطبيق أي رقعة، فمكانه النواة لا `esharqplugins`.
    // ولذلك رآه المكوّن إضافةً من فينكورد فعلّق عليها شارتها — شارة خاطئة
    // على أخصّ ما بنيناه. والانتماء يُعلَن هنا حين لا يدلّ عليه المسار.
    "EsharqArabicLocale",
]);

const USERPLUGINS_ICON_URI = SAUDICORD_LOGO;

export function PluginCard({ plugin, disabled, onRestartNeeded, onMouseEnter, onMouseLeave, isNew }: PluginCardProps) {
    // Subscribe so the card re-renders on language toggle (resolvePluginDescription
    // reads the mode but does not itself establish a React subscription).
    useSettings(["plugins.Settings.arabicMode"]);
    const displayDescription = resolvePluginDescription(plugin.name, plugin.description);

    const settings = Settings.plugins[plugin.name];
    const pluginMeta = PluginMeta[plugin.name];
    const folderName = pluginMeta?.folderName ?? "";
    const isEquicordPlugin = folderName.startsWith("src/equicordplugins/");
    const isVencordPlugin = folderName.startsWith("src/plugins/");
    const isUserPlugin = folderName.startsWith("src/userplugins/");
    // إضافات SaudiCord نفسها: تحمل الشارة كإضافات الفرع، ولا تُحسب «شخصية».
    const isEsharqPlugin = folderName.startsWith("src/esharqplugins/");
    const isModifiedPlugin = plugin.isModified ?? false;
    const isForkExclusive = FORK_EXCLUSIVE_PLUGINS.has(plugin.name);
    const isForkBranded = isForkExclusive || isUserPlugin || isEsharqPlugin;

    const isEnabled = () => isPluginEnabled(plugin.name);

    /**
     * 🔴 جلسة تنصيفٍ جارية تُخفي هذه الإضافة.
     *
     * وهذا كان يُنتج مفتاحاً **يكذب**: `isPluginEnabled` يُرجع `false` لأنّ
     * التنصيف يعلو على كل شيء، فالضغط يُسند `enabled = !false` أي `true` —
     * وهي `true` في الإعدادات أصلاً، فيقصر مخزن الإعدادات ولا يكتب ولا يُنبّه.
     * النتيجة: بطاقةٌ مُطفأة، وضغطةٌ لا تفعل شيئاً، ولا سطر يقول لماذا.
     * وحتى الإضافات الضرورية تُطفأ هكذا — قِسته.
     *
     * الآن يُعطَّل المفتاح ويُقال السبب في التلميح، فلا يظنّ صاحبه أنّ SaudiCord
     * تعطّل. وإنهاء الجلسة من صفحة «تنصيف الانهيار».
     */
    const hiddenByBisect = isHiddenByBisect(plugin.name);

    function toggleEnabled() {
        // لا يُلمَس شيء ما دامت الجلسة تُخفيها: الإعدادات على حالها، والعرض
        // وحده مُعطَّل — فكتابةٌ هنا تُفسد ما سيعود بعد انتهاء التنصيف.
        if (hiddenByBisect) return;

        const wasEnabled = isEnabled();

        // If we're enabling a plugin, make sure all deps are enabled recursively.
        if (!wasEnabled) {
            const { restartNeeded, failures } = startDependenciesRecursive(plugin);

            if (failures.length) {
                logger.error(`Failed to start dependencies for ${plugin.name}: ${failures.join(", ")}`);
                showNotice("Failed to start dependencies: " + failures.join(", "), "Close", () => null);
                return;
            }

            if (restartNeeded) {
                // If any dependencies have patches, don't start the plugin yet.
                settings.enabled = true;
                onRestartNeeded(plugin.name, "enabled");
                return;
            }
        }

        // if the plugin requires a restart, don't use stopPlugin/startPlugin. Wait for restart to apply changes.
        if (pluginRequiresRestart(plugin)) {
            settings.enabled = !wasEnabled;
            onRestartNeeded(plugin.name, "enabled");
            return;
        }

        // If the plugin is enabled, but hasn't been started, then we can just toggle it off.
        if (wasEnabled && !plugin.started) {
            settings.enabled = !wasEnabled;
            return;
        }

        const result = wasEnabled ? stopPlugin(plugin) : startPlugin(plugin);

        if (!result) {
            settings.enabled = false;

            const msg = `Error while ${wasEnabled ? "stopping" : "starting"} plugin ${plugin.name}`;
            showToast(msg, Toasts.Type.FAILURE, {
                position: Toasts.Position.BOTTOM,
            });

            return;
        }

        settings.enabled = !wasEnabled;
    }

    const pluginInfo = [
        {
            condition: isModifiedPlugin,
            src: "https://equicord.org/assets/icons/equicord/modified.png",
            alt: "Modified",
            title: "Modified Vencord Plugin"
        },
        {
            // 🔴 الاسم إنجليزي دائماً كأخواته («Equicord Plugin» و«Vencord
            // Plugin»): هذه أسماء مشاريع لا عبارات تُترجَم، وتعريب واحدة
            // منها وحدها يجعل الثلاثة تبدو ثلاثة أنظمة لا صفّاً واحداً.
            condition: isForkBranded,
            src: USERPLUGINS_ICON_URI,
            alt: "SaudiCord",
            title: "SaudiCord Plugin"
        },
        {
            condition: isEquicordPlugin,
            src: "https://equicord.org/assets/favicon.png",
            alt: "Equicord",
            title: "Equicord Plugin"
        },
        {
            condition: isVencordPlugin,
            src: "https://equicord.org/assets/icons/vencord/icon-light.png",
            alt: "Vencord",
            title: "Vencord Plugin"
        }
    ];

    const pluginDetails = pluginInfo.find(p => p.condition);

    const sourceBadge = pluginDetails ? (
        <img
            src={pluginDetails.src}
            alt={pluginDetails.alt}
            className={cl("source")}
        />
    ) : null;

    // 🔴 اسم المصدر يبقى على شارته — لا يُمحى بشرحٍ آخر.
    const tooltip = pluginDetails?.title || "Unknown Plugin";

    // والشرح يوضع على المفتاح نفسه، وهو ما يُحوّم عليه من يراه رمادياً.
    const toggleTooltip = hiddenByBisect
        ? t("مخفيّة مؤقّتاً بجلسة تنصيف انهيار. إعداداتك لم تتغيّر — تعود بعد إعادة تشغيل SaudiCord.",
            "Temporarily hidden by a crash-bisect session. Your settings are untouched — it returns after you restart SaudiCord.")
        : undefined;

    return (
        <AddonCard
            name={plugin.name}
            sourceBadge={sourceBadge}
            tooltip={tooltip}
            toggleTooltip={toggleTooltip}
            description={displayDescription}
            tags={plugin.tags}
            isNew={isNew}
            enabled={isEnabled()}
            setEnabled={toggleEnabled}
            disabled={disabled || hiddenByBisect}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            infoButton={
                <button
                    role="switch"
                    onClick={() => openPluginModal(plugin, onRestartNeeded)}
                    className={cl("info-button")}
                >
                    {hasAnyVisibleSettings(plugin)
                        ? <CogWheel className={cl("info-icon")} />
                        : <InfoIcon className={cl("info-icon")} />
                    }
                </button>
            } />
    );
}
