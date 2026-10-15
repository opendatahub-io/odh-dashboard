export const GRID = 'grid';

const DEV_FEATURE_FLAGS_PARAM = 'devFeatureFlags';
const FEATURE_FLAGS_SESSION_KEY = 'odh-feature-flags';

export const getPortalFeatureFlagOverrides = (): Record<string, boolean> => {
  const searchParams = new URLSearchParams(window.location.search);
  const queryValue = searchParams.get(DEV_FEATURE_FLAGS_PARAM);
  const sessionValue = window.sessionStorage.getItem(FEATURE_FLAGS_SESSION_KEY);
  const value = queryValue ?? sessionValue;

  if (!value) {
    return {};
  }

  try {
    if (value === 'true' || value === 'false') {
      return { [GRID]: value === 'true' };
    }

    if (value.startsWith('{')) {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        Object.prototype.hasOwnProperty.call(parsed, GRID)
      ) {
        const gridValue = Object.entries(parsed).find(([key]) => key === GRID)?.[1];
        return typeof gridValue === 'boolean' ? { [GRID]: gridValue } : {};
      }
      return {};
    }

    const gridEntry = value.split(',').find((entry) => entry.split('=')[0] === GRID);
    if (!gridEntry) {
      return {};
    }

    return { [GRID]: gridEntry.split('=')[1] === 'true' };
  } catch {
    return {};
  }
};

export const persistPortalFeatureFlagOverrides = (overrides: Record<string, boolean>): void => {
  if (Object.keys(overrides).length === 0) {
    window.sessionStorage.removeItem(FEATURE_FLAGS_SESSION_KEY);
  } else {
    window.sessionStorage.setItem(FEATURE_FLAGS_SESSION_KEY, JSON.stringify(overrides));
  }
};
