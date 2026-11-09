/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Use the single SaudiCord app icon from the main browser assets.
import iconBase64 from "file://../../../browser/icon.png?base64";

export const SAUDICORD_LOGO = `data:image/png;base64,${iconBase64}`;

// Compatibility alias for any remaining upstream imports.
export const ESHARQ_LOGO = SAUDICORD_LOGO;
