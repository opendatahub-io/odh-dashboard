export const BFF_API_VERSION = 'v1';

export enum Theme {
  Default = 'default-theme',
  MUI = 'mui-theme',
  // Future themes can be added here
}

export const isMUITheme = (): boolean => STYLE_THEME === Theme.MUI;
const STYLE_THEME = process.env.STYLE_THEME || Theme.MUI;
