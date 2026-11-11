/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { t } from "@utils/esharqI18n";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { changes, checkForUpdates, update, updateError } from "@utils/updater";
import { ConfirmModal, openModal, React, Toasts, useState } from "@webpack/common";

import { runWithDispatch } from "./runWithDispatch";

export interface CommonProps {
    repo: string;
    repoPending: boolean;
}

export function HashLink({ repo, hash, disabled = false }: { repo: string, hash: string, disabled?: boolean; }) {
    return (
        <Link href={`${repo}/commit/${hash}`} disabled={disabled}>
            {hash.slice(0, 7)}
        </Link>
    );
}

export function Changes({ updates, repo, repoPending }: CommonProps & { updates: typeof changes; }) {
    return (
        <Card className={Margins.top16} style={{ padding: 0 }} defaultPadding={false}>
            {updates.map(({ hash, author, message }, i) => (
                <div
                    key={hash}
                    style={{
                        padding: "12px 16px",
                        borderBottom: i < updates.length - 1 ? "1px solid var(--border-subtle)" : undefined
                    }}
                >
                    <Flex style={{ alignItems: "center", gap: 8 }}>
                        <code style={{ color: "var(--text-link)" }}>
                            <HashLink {...{ repo, hash }} disabled={repoPending} />
                        </code>
                        <Span size="sm" color="text-default">
                            {message}
                        </Span>
                        <Span size="sm" color="text-subtle">
                            — {author}
                        </Span>
                    </Flex>
                </div>
            ))}
        </Card>
    );
}

export function Newer(props: CommonProps) {
    return (
        <>
            <Paragraph>
                Your local copy has more recent commits than the remote repository. This usually happens when you've made local changes. Please stash or reset them before updating.
            </Paragraph>
            <Changes {...props} updates={changes} />
        </>
    );
}

export function Updatable() {
    const [isUpdating, setIsUpdating] = useState(false);

    return (
        <Flex flexDirection="column" gap="0.75em">
            <Button
                variant="primary"
                disabled={isUpdating}
                onClick={runWithDispatch(setIsUpdating, async () => {
                    try {
                        const outdated = await checkForUpdates();

                        if (!outdated) {
                            Toasts.show({
                                message: t("SaudiCord محدّث بالفعل. أنت على آخر إصدار.", "SaudiCord is already up to date."),
                                id: Toasts.genId(),
                                type: Toasts.Type.SUCCESS,
                                options: { position: Toasts.Position.BOTTOM }
                            });
                            return;
                        }

                        const didUpdate = await update();
                        if (!didUpdate) {
                            Toasts.show({
                                message: t("لم يتم تطبيق التحديث. حاول مرة أخرى.", "The update could not be applied. Please try again."),
                                id: Toasts.genId(),
                                type: Toasts.Type.FAILURE,
                                options: { position: Toasts.Position.BOTTOM }
                            });
                            return;
                        }

                        await new Promise<void>(resolve => {
                            openModal(modalProps => (
                                <ConfirmModal
                                    {...modalProps}
                                    title={t("تم تحديث SaudiCord", "SaudiCord updated")}
                                    subtitle={t("تم تنزيل التحديث وتثبيته. أعد تشغيل Discord لتطبيق التغييرات.", "The update was downloaded and installed. Restart Discord to apply the changes.")}
                                    confirmText={t("إعادة التشغيل الآن", "Restart now")}
                                    cancelText={t("لاحقاً", "Later")}
                                    variant="primary"
                                    onConfirm={() => {
                                        relaunch();
                                        resolve();
                                    }}
                                    onCancel={resolve}
                                />
                            ));
                        });
                    } catch (error) {
                        Toasts.show({
                            message: t("فشل التحديث. تحقق من اتصالك وحاول مرة أخرى.", "Update failed. Check your connection and try again."),
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE,
                            options: { position: Toasts.Position.BOTTOM }
                        });
                        console.error("[SaudiCord] Update failed", error);
                    }
                })}
            >
                {isUpdating
                    ? t("جارٍ التحديث…", "Updating…")
                    : t("تحديث SaudiCord", "Update SaudiCord")}
            </Button>
            <Paragraph color="text-subtle">
                {t("اضغط الزر للتحقق من وجود إصدار جديد وتثبيته مباشرة. ستحتاج إلى إعادة تشغيل Discord لتطبيق التحديث.", "Press the button to check for and install the latest release. Discord must restart to apply the update.")}
            </Paragraph>
        </Flex>
    );
}
