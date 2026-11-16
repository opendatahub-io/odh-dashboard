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
  it('should default to the light theme and solid contrast', () => {
    renderProvider();
    expect(latestCtx?.theme).toBe('light');
    expect(latestCtx?.contrastMode).toBe('default');
    expect(html()).not.toHaveClass('pf-v6-theme-dark');
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
  });

  it('should apply a stored dark theme', () => {
    localStorage.setItem('app-shell.theme', 'dark');
    renderProvider();
    expect(latestCtx?.theme).toBe('dark');
    expect(html()).toHaveClass('pf-v6-theme-dark');
  });

  it('should apply a stored glass contrast mode', () => {
    localStorage.setItem('app-shell.contrastMode', 'glass');
    renderProvider();
    expect(html()).toHaveClass('pf-v6-theme-glass');
    expect(html()).not.toHaveClass('pf-v6-theme-high-contrast');
  });

  it('should resolve the system contrast mode to solid when the OS prefers reduced transparency', () => {
    localStorage.setItem('app-shell.contrastMode', 'system');
    mediaState['(prefers-reduced-transparency: reduce)'] = true;
    renderProvider();
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
    expect(html()).not.toHaveClass('pf-v6-theme-high-contrast');
  });

  it('should resolve the system contrast mode to high contrast when the OS prefers more contrast', () => {
    localStorage.setItem('app-shell.contrastMode', 'system');
    mediaState['(prefers-contrast: more)'] = true;
    renderProvider();
    expect(html()).toHaveClass('pf-v6-theme-high-contrast');
    expect(html()).not.toHaveClass('pf-v6-theme-glass');
  });

  it('should persist theme and contrast changes and dispatches the change event', () => {
    renderProvider();
    const events: CustomEvent[] = [];
    window.addEventListener('odh-theme-change', (e) => events.push(e as CustomEvent));
    act(() => {
      latestCtx?.setTheme('dark');
    });
    act(() => {
      latestCtx?.setContrastMode('glass');
    });
    expect(localStorage.getItem('app-shell.theme')).toBe('dark');
    expect(localStorage.getItem('app-shell.contrastMode')).toBe('glass');
    expect(html()).toHaveClass('pf-v6-theme-dark');
    expect(html()).toHaveClass('pf-v6-theme-glass');
    expect(events).toHaveLength(2);
    expect(events[0].detail).toEqual({ theme: 'dark', contrastMode: 'default' });
    expect(events[1].detail).toEqual({ theme: 'dark', contrastMode: 'glass' });
  });

  it('should follow live OS contrast changes while the system mode is active', () => {
    localStorage.setItem('app-shell.contrastMode', 'system');
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
