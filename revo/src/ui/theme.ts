export type UiThemeId = "amber" | "dark" | "light" | "mint";

export type UiThemeOption = {
  id: UiThemeId;
  label: string;
};

export const defaultUiTheme: UiThemeId = "amber";

export const uiThemeOptions: ReadonlyArray<UiThemeOption> = [
  { id: "amber", label: "暖黄" },
  { id: "dark", label: "深色" },
  { id: "light", label: "白色" },
  { id: "mint", label: "护眼绿" },
];

const THEME_STORAGE_KEY = "revo.ui.theme";

export function isUiThemeId(value: string | undefined): value is UiThemeId {
  if (typeof value !== "string") {
    return false;
  }
  return uiThemeOptions.some((theme) => theme.id === value);
}

export function getInitialUiTheme(): UiThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) ?? undefined;
    if (isUiThemeId(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted environments.
  }
  return defaultUiTheme;
}

export function applyUiTheme(theme: UiThemeId): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage access errors in restricted environments.
  }
}
