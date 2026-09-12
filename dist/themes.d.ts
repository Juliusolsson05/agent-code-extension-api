export declare const EXTENSION_THEME_COLOR_KEYS: readonly ["canvas", "surface", "surfaceHi", "ink", "inkDim", "muted", "border", "borderHi", "accent", "accentFg", "accentSoft", "focusRing", "panelBg", "panelHeaderBg", "panelElevatedBg", "panelBorder", "rowBg", "rowHoverBg", "rowSelectedBg", "rowSelectedFg", "rowDangerSelectedBg", "controlBg", "controlHoverBg", "controlActiveBg", "controlBorder", "controlBorderHover", "controlFg", "controlActiveFg", "inputBg", "inputBorder", "inputBorderFocus", "inputPlaceholder", "tabBg", "tabActiveBg", "tabHoverBg", "tabAccent", "popoverBg", "popoverBorder", "overlayScrim", "overlayScrimStrong", "shadowColor", "codeBg", "codeBorder", "codeCurrentLineBg", "codeSelectionBg", "codeSelectionInactiveBg", "codeScrollbarBg", "codeScrollbarHoverBg", "codeScrollbarActiveBg", "editorBg", "editorFg", "editorCurrentLineBg", "editorSelectionBg", "editorSelectionInactiveBg", "editorScrollbarBg", "editorScrollbarHoverBg", "editorScrollbarActiveBg", "danger", "dangerFg", "dangerSoft", "dangerBorder", "success", "successFg", "successSoft", "successBorder", "warning", "warningFg", "warningSoft", "warningBorder", "info", "infoFg", "infoSoft", "infoBorder", "codeInk", "codeInkDim", "userBg", "toolBg", "diffAddBg", "diffRemoveBg", "diffAddFg", "diffRemoveFg"];
export type ExtensionThemeColorKey = typeof EXTENSION_THEME_COLOR_KEYS[number];
/** Literal colors cannot load URLs, expand host variables or change non-color CSS. */
export type ExtensionThemeColor = `#${string}` | 'transparent';
export type ExtensionThemeContribution = {
    /** Namespaced <extensionId>.<name>; selection remains stable across bundle updates. */
    id: string;
    title: string;
    /** Omitted tokens use Agent Code's default appearance values. */
    colors: Partial<Record<ExtensionThemeColorKey, ExtensionThemeColor>>;
};
