import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useThemeContext } from '../ThemeContext';

type Listener = (event: { matches: boolean }) => void;
const mediaState: Record<string, boolean> = {};
const mediaListeners: Record<string, Set<Listener>> = {};

let latestCtx: ReturnType<typeof useThemeContext> | undefined;

const Probe: React.FC = () => {
  latestCtx = useThemeContext();
  return null;
};

const renderProvider = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
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

describe('base shell ThemeProvider', () => {
  it('should default to the system color scheme resolving light, with Glass contrast', () => {
    renderProvider();
    expect(latestCtx?.colorScheme).toBe('system');
    expect(latestCtx?.theme).toBe('light');
    expect(latestCtx?.contrastMode).toBe('system');
    expect(html()).not.toHaveClass('pf-v6-theme-dark');
    expect(html()).toHaveClass('pf-v6-theme-glass');
  });

  it('should resolve the system color scheme to dark when the OS prefers dark', () => {
    mediaState['(prefers-color-scheme: dark)'] = true;
    renderProvider();
    expect(latestCtx?.theme).toBe('dark');
    expect(html()).toHaveClass('pf-v6-theme-dark');
  });

  it('should apply a stored dark color scheme', () => {
    localStorage.setItem('app-shell.colorScheme', 'dark');
    renderProvider();
    expect(latestCtx?.colorScheme).toBe('dark');
    expect(latestCtx?.theme).toBe('dark');
    expect(html()).toHaveClass('pf-v6-theme-dark');
  });

  it('should derive the color scheme from the legacy theme key', () => {
    localStorage.setItem('app-shell.theme', 'dark');
    renderProvider();
    expect(latestCtx?.colorScheme).toBe('dark');
    expect(html()).toHaveClass('pf-v6-theme-dark');
  });

  it('should apply a stored glass contrast mode', () => {
    localStorage.setItem('app-shell.contrastMode', 'glass');
    renderProvider();
    expect(html()).toHaveClass('pf-v6-theme-glass');
    expect(html()).not.toHaveClass('pf-v6-theme-high-contrast');
  });

  it('should resolve the system contrast mode to solid when the OS prefers reduced transparency', () => {
    mediaState['(prefers-reduced-transparency: reduce)'] = true;
    renderProvider();
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
    expect(html()).not.toHaveClass('pf-v6-theme-high-contrast');
  });

  it('should resolve the system contrast mode to high contrast when the OS prefers more contrast', () => {
    mediaState['(prefers-contrast: more)'] = true;
    renderProvider();
    expect(html()).toHaveClass('pf-v6-theme-high-contrast');
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
  });

  it('should persist color scheme and contrast changes and dispatch the change event', () => {
    renderProvider();
    const events: CustomEvent[] = [];
    window.addEventListener('odh-theme-change', (e) => events.push(e as CustomEvent));
    act(() => {
      latestCtx?.setColorScheme('dark');
    });
    act(() => {
      latestCtx?.setContrastMode('default');
    });
    expect(localStorage.getItem('app-shell.colorScheme')).toBe('dark');
    expect(localStorage.getItem('app-shell.theme')).toBeNull();
    expect(localStorage.getItem('app-shell.contrastMode')).toBe('default');
    expect(html()).toHaveClass('pf-v6-theme-dark');
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
    expect(events).toHaveLength(2);
    expect(events[0].detail).toEqual({
      theme: 'dark',
      colorScheme: 'dark',
      contrastMode: 'system',
    });
    expect(events[1].detail).toEqual({
      theme: 'dark',
      colorScheme: 'dark',
      contrastMode: 'default',
    });
  });

  it('should map the legacy setTheme onto the color scheme', () => {
    renderProvider();
    act(() => {
      latestCtx?.setTheme('dark');
    });
    expect(latestCtx?.colorScheme).toBe('dark');
    expect(localStorage.getItem('app-shell.colorScheme')).toBe('dark');
  });

  it('should follow live OS contrast changes while the system mode is active', () => {
    renderProvider();
    expect(html()).toHaveClass('pf-v6-theme-glass');
    act(() => {
      mediaListeners['(prefers-reduced-transparency: reduce)'].forEach((listener) =>
        listener({ matches: true }),
      );
    });
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
  });
});
