import type { MCPIcon } from '~/odh/types/mcpRegistryTypes';
import {
  resolveIcon,
  sanitizeHref,
  parseServerJsonIcons,
  resolveActionButtonState,
  isValidMcpServerName,
} from '~/odh/utils/registerUtils';

describe('resolveIcon', () => {
  const light: MCPIcon = { src: 'https://example.com/light.svg', theme: 'light' };
  const dark: MCPIcon = { src: 'https://example.com/dark.svg', theme: 'dark' };
  const any: MCPIcon = { src: 'https://example.com/any.svg' };

  it('returns undefined for empty input', () => {
    expect(resolveIcon(undefined, false)).toBeUndefined();
    expect(resolveIcon([], true)).toBeUndefined();
  });

  it('prefers the matching theme then falls back to Any', () => {
    expect(resolveIcon([any, light, dark], false)).toEqual(light);
    expect(resolveIcon([any, light, dark], true)).toEqual(dark);
    expect(resolveIcon([any], false)).toEqual(any);
    expect(resolveIcon([any], true)).toEqual(any);
  });
});

describe('sanitizeHref', () => {
  it('allows https URLs only', () => {
    expect(sanitizeHref('https://example.com/icon.svg')).toBe('https://example.com/icon.svg');
    expect(sanitizeHref('data:image/svg+xml;base64,abc')).toBeUndefined();
    expect(sanitizeHref('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeHref('not a url')).toBeUndefined();
    expect(sanitizeHref(undefined)).toBeUndefined();
  });

  it('rejects http URLs', () => {
    // Regression test: MLflow's MCP Registry rejects `http:` icon URLs by default
    // (`MLFLOW_ICON_URL_ALLOWED_SCHEMES` defaults to `["https"]`). Accepting them here would
    // let a value through the Icons field only to fail the real metadata PATCH at submit time.
    expect(sanitizeHref('http://example.com/icon.svg')).toBeUndefined();
  });
});

describe('parseServerJsonIcons', () => {
  it('parses valid icon entries and ignores invalid ones', () => {
    expect(
      parseServerJsonIcons({
        icons: [
          { src: 'https://example.com/a.svg', theme: 'light' },
          { src: '  https://example.com/b.svg  ' },
          { src: '' },
          { theme: 'dark' },
          'nope',
        ],
      }),
    ).toEqual([
      { src: 'https://example.com/a.svg', theme: 'light' },
      { src: 'https://example.com/b.svg' },
    ]);
  });
});

describe('isValidMcpServerName', () => {
  it.each([
    'com.example/my-server',
    'io.github.example/weather-server',
    'ab/cd',
    'a1.b2-c3/slug_with.chars-99',
  ])('accepts a valid name: %s', (name) => {
    expect(isValidMcpServerName(name)).toBe(true);
  });

  it.each([
    '',
    'no-slash-at-all',
    'too/many/slashes',
    '/leading-slash-empty-namespace',
    'trailing-slash-empty-slug/',
    'a/b_c',
    '-leadinghyphen/slug',
    'namespace-/slug',
    'namespace/-slug',
    'namespace/slug-',
    'a/b', // each segment's regex needs distinct start+end chars, so a 1-char segment can't match
    'namespace/s',
    'com.example/versions',
    'com.example/endpoints',
    'com.example/aliases',
    'com.example/tags',
  ])('rejects an invalid name: %s', (name) => {
    expect(isValidMcpServerName(name)).toBe(false);
  });
});

describe('resolveActionButtonState', () => {
  it('returns enabled when no check matches', () => {
    expect(resolveActionButtonState([{ when: false, loading: true, tooltip: 'nope' }])).toEqual({
      enabled: true,
      loading: false,
    });
  });

  it('returns the first matching check, ignoring later ones', () => {
    expect(
      resolveActionButtonState([
        { when: false, loading: true, tooltip: 'skipped' },
        { when: true, loading: true, tooltip: 'loading...' },
        { when: true, loading: false, tooltip: 'unreachable' },
      ]),
    ).toEqual({ enabled: false, loading: true, tooltip: 'loading...' });
  });
});
