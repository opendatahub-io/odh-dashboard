import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserStorageContextProvider } from '@odh-dashboard/ui-core/hooks';
import { ThemeProvider, useThemeContext, migrateLegacyThemeStorage } from '#~/app/ThemeContext';

type Listener = (event: { matches: boolean }) => void;
const mediaState: Record<string, boolean> = {};
const mediaListeners: Record<string, Set<Listener>> = {};

const fireMediaChange = (query: string, matches: boolean): void => {
  mediaState[query] = matches;
  act(() => {
    mediaListeners[query].forEach((listener) => listener({ matches }));
  });
};

let latestCtx: ReturnType<typeof useThemeContext> | undefined;

const Probe: React.FC = () => {
  latestCtx = useThemeContext();
  return null;
};

const renderProvider = () =>
  render(
    <BrowserStorageContextProvider>
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    </BrowserStorageContextProvider>,
  );

const html = () => document.documentElement;

beforeEach(() => {
  Object.keys(mediaState).forEach((k) => delete mediaState[k]);
  Object.keys(mediaListeners).forEach((k) => delete mediaListeners[k]);
  localStorage.clear();
  html().classList.remove('pf-v6-theme-dark', 'pf-v6-theme-glass', 'pf-v6-theme-high-contrast');
  latestCtx = undefined;
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: !!mediaState[query],
    media: query,
    onchange: null,
    addEventListener: (_: unknown, listener: Listener) => {
      (mediaListeners[query] ??= new Set()).add(listener);
    },
    removeEventListener: (_: unknown, listener: Listener) => {
      mediaListeners[query].delete(listener);
    },
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
});

describe('ThemeProvider', () => {
  it('should default to the light theme and Glass contrast with no stored preferences', () => {
    renderProvider();
    expect(latestCtx?.theme).toBe('light');
    expect(latestCtx?.contrastMode).toBe('system');
    expect(html()).not.toHaveClass('pf-v6-theme-dark');
    expect(html()).toHaveClass('pf-v6-theme-glass');
    expect(html()).not.toHaveClass('pf-v6-theme-high-contrast');
  });

  it('should resolve the system color scheme to dark when the OS prefers dark', () => {
    mediaState['(prefers-color-scheme: dark)'] = true;
    renderProvider();
    expect(latestCtx?.theme).toBe('dark');
    expect(html()).toHaveClass('pf-v6-theme-dark');
  });

  it('should apply a stored dark color scheme', () => {
    localStorage.setItem('odh.dashboard.ui.colorScheme', '"dark"');
    renderProvider();
    expect(latestCtx?.colorScheme).toBe('dark');
    expect(html()).toHaveClass('pf-v6-theme-dark');
  });

  it('should persist an explicit glass choice across remounts', () => {
    const { unmount } = renderProvider();
    act(() => {
      latestCtx?.setContrastMode('glass');
    });
    expect(html()).toHaveClass('pf-v6-theme-glass');
    expect(html()).not.toHaveClass('pf-v6-theme-high-contrast');
    expect(localStorage.getItem('odh.dashboard.ui.contrastMode')).toBe('"glass"');
    unmount();

    html().classList.remove('pf-v6-theme-glass');
    renderProvider();
    expect(latestCtx?.contrastMode).toBe('glass');
    expect(html()).toHaveClass('pf-v6-theme-glass');
  });

  it('should keep glass and high contrast mutually exclusive', () => {
    renderProvider();
    act(() => {
      latestCtx?.setContrastMode('high-contrast');
    });
    expect(html()).toHaveClass('pf-v6-theme-high-contrast');
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
  });

  it('should resolve the system contrast mode to solid when the OS prefers reduced transparency', () => {
    localStorage.setItem('odh.dashboard.ui.contrastMode', '"system"');
    mediaState['(prefers-reduced-transparency: reduce)'] = true;
    renderProvider();
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
    expect(html()).not.toHaveClass('pf-v6-theme-high-contrast');
  });

  it('should resolve the system contrast mode to high contrast when the OS prefers more contrast', () => {
    localStorage.setItem('odh.dashboard.ui.contrastMode', '"system"');
    mediaState['(prefers-contrast: more)'] = true;
    renderProvider();
    expect(html()).toHaveClass('pf-v6-theme-high-contrast');
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
  });

  it('should follow live OS color scheme changes while the system scheme is active', () => {
    renderProvider();
    expect(html()).not.toHaveClass('pf-v6-theme-dark');
    fireMediaChange('(prefers-color-scheme: dark)', true);
    expect(latestCtx?.theme).toBe('dark');
    expect(html()).toHaveClass('pf-v6-theme-dark');
    fireMediaChange('(prefers-color-scheme: dark)', false);
    expect(latestCtx?.theme).toBe('light');
    expect(html()).not.toHaveClass('pf-v6-theme-dark');
  });

  it('should migrate a legacy theme preference on mount', () => {
    localStorage.setItem('odh.dashboard.ui.theme', '"dark"');
    renderProvider();
    expect(latestCtx?.colorScheme).toBe('dark');
    expect(html()).toHaveClass('pf-v6-theme-dark');
    expect(localStorage.getItem('odh.dashboard.ui.colorScheme')).toBe('"dark"');
    expect(localStorage.getItem('odh.dashboard.ui.theme')).toBeNull();
  });
});

describe('migrateLegacyThemeStorage', () => {
  const storage = (): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> => localStorage;

  it('should map a legacy dark preference to the color scheme key', () => {
    localStorage.setItem('odh.dashboard.ui.theme', '"dark"');
    migrateLegacyThemeStorage(storage());
    expect(localStorage.getItem('odh.dashboard.ui.colorScheme')).toBe('"dark"');
    expect(localStorage.getItem('odh.dashboard.ui.theme')).toBeNull();
  });

  it('should map a legacy light preference to the color scheme key', () => {
    localStorage.setItem('odh.dashboard.ui.theme', '"light"');
    migrateLegacyThemeStorage(storage());
    expect(localStorage.getItem('odh.dashboard.ui.colorScheme')).toBe('"light"');
  });

  it('should accept raw unquoted legacy values', () => {
    localStorage.setItem('odh.dashboard.ui.theme', 'dark');
    migrateLegacyThemeStorage(storage());
    expect(localStorage.getItem('odh.dashboard.ui.colorScheme')).toBe('"dark"');
  });

  it('should ignore garbage legacy values but still remove the legacy key', () => {
    localStorage.setItem('odh.dashboard.ui.theme', '"banana"');
    migrateLegacyThemeStorage(storage());
    expect(localStorage.getItem('odh.dashboard.ui.colorScheme')).toBeNull();
    expect(localStorage.getItem('odh.dashboard.ui.theme')).toBeNull();
  });

  it('should leave an existing color scheme key untouched', () => {
    localStorage.setItem('odh.dashboard.ui.colorScheme', '"light"');
    localStorage.setItem('odh.dashboard.ui.theme', '"dark"');
    migrateLegacyThemeStorage(storage());
    expect(localStorage.getItem('odh.dashboard.ui.colorScheme')).toBe('"light"');
    expect(localStorage.getItem('odh.dashboard.ui.theme')).toBeNull();
  });

  it('should tolerate unavailable storage', () => {
    const throwing: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
      getItem: () => {
        throw new Error('unavailable');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(() => migrateLegacyThemeStorage(throwing)).not.toThrow();
  });
});
