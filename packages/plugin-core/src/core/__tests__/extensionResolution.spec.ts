import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { SUPPRESS_EXTENSION_TYPE } from '../../extension-points/suppress';
import { PATCH_EXTENSION_TYPE } from '../../extension-points/patch';
import { extensionKey, extractPatches, applySuppress, applyPatches } from '../extensionResolution';

const loaded = (ext: Extension & { pluginName?: string; uid?: string }): LoadedExtension => ({
  ...ext,
  pluginName: ext.pluginName ?? 'test',
  uid: ext.uid ?? 'uid',
});

describe('extensionKey', () => {
  it('should encode type and id as a collision-free tuple', () => {
    expect(extensionKey('app.navigation/href', 'nav-1')).toBe(
      JSON.stringify(['app.navigation/href', 'nav-1']),
    );
  });

  it('should keep type and id distinct when either contains "::"', () => {
    expect(extensionKey('a::b', 'c')).not.toBe(extensionKey('a', 'b::c'));
  });
});

describe('extractPatches', () => {
  let warnSpy: jest.SpyInstance;
  let originalEnv: string | undefined;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should collect patch payloads and drop patch extensions from the list', () => {
    const href = loaded({
      type: 'app.navigation/href',
      properties: { id: 'item', title: 'Original', href: '/x' },
    });
    const patch = loaded({
      type: PATCH_EXTENSION_TYPE,
      pluginName: 'distribution',
      properties: {
        targetType: 'app.navigation/href',
        targetId: 'item',
        patch: { title: 'Patched' },
      },
    });

    const { extensions, patches } = extractPatches([href, patch]);

    expect(extensions).toEqual([href]);
    expect(patches.get(extensionKey('app.navigation/href', 'item'))).toEqual({
      patch: { title: 'Patched' },
      pluginName: 'distribution',
    });
  });

  it('should keep the last whole patch when multiple patches target the same key', () => {
    const { patches } = extractPatches([
      loaded({
        type: PATCH_EXTENSION_TYPE,
        pluginName: 'distA',
        properties: {
          targetType: 'app.navigation/href',
          targetId: 'item',
          patch: { title: 'From A', group: 'gA' },
        },
      }),
      loaded({
        type: PATCH_EXTENSION_TYPE,
        pluginName: 'distB',
        properties: {
          targetType: 'app.navigation/href',
          targetId: 'item',
          patch: { title: 'From B' },
        },
      }),
    ]);

    expect(patches.get(extensionKey('app.navigation/href', 'item'))).toEqual({
      patch: { title: 'From B' },
      pluginName: 'distB',
    });
  });

  it('should warn and ignore invalid patch extensions in development', () => {
    process.env.NODE_ENV = 'development';

    const { extensions, patches } = extractPatches([
      loaded({
        type: PATCH_EXTENSION_TYPE,
        properties: { targetType: '', targetId: 'x', patch: { title: 'x' } },
      }),
    ]);

    expect(extensions).toHaveLength(0);
    expect(patches.size).toBe(0);
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('Invalid patch'))).toBe(true);
  });

  it('should ignore null properties or patch without throwing', () => {
    process.env.NODE_ENV = 'development';

    const nullProperties = loaded({
      type: PATCH_EXTENSION_TYPE,
      properties: { targetType: 'app.navigation/href', targetId: 'x', patch: { title: 'x' } },
    });
    Object.assign(nullProperties, { properties: null });

    const nullPatch = loaded({
      type: PATCH_EXTENSION_TYPE,
      properties: { targetType: 'app.navigation/href', targetId: 'x', patch: null as never },
    });

    let patches: Map<string, unknown> | undefined;
    expect(() => {
      ({ patches } = extractPatches([nullProperties, nullPatch]));
    }).not.toThrow();

    expect(patches?.size).toBe(0);
    expect(warnSpy.mock.calls.filter((c) => String(c[0]).includes('Invalid patch'))).toHaveLength(
      2,
    );
  });

  it('should ignore patches with invalid allowlisted field types', () => {
    process.env.NODE_ENV = 'development';

    const { patches } = extractPatches([
      loaded({
        type: PATCH_EXTENSION_TYPE,
        properties: {
          targetType: 'app.navigation/href',
          targetId: 'item',
          patch: { title: 1 as never },
        },
      }),
      loaded({
        type: PATCH_EXTENSION_TYPE,
        properties: {
          targetType: 'app.navigation/href',
          targetId: 'item-2',
          patch: { section: true as never },
        },
      }),
      loaded({
        type: PATCH_EXTENSION_TYPE,
        properties: {
          targetType: 'app.navigation/href',
          targetId: 'item-3',
          patch: { dataAttributes: { id: 1 } as never },
        },
      }),
      loaded({
        type: PATCH_EXTENSION_TYPE,
        properties: {
          targetType: 'app.navigation/href',
          targetId: 'item-4',
          patch: { dataAttributes: { target: '_blank' } as never },
        },
      }),
      loaded({
        type: PATCH_EXTENSION_TYPE,
        properties: {
          targetType: 'app.navigation/href',
          targetId: 'ok',
          patch: { section: null, label: null, title: 'Valid' },
        },
      }),
      loaded({
        type: PATCH_EXTENSION_TYPE,
        properties: {
          targetType: 'app.navigation/href',
          targetId: 'ok-data',
          patch: { dataAttributes: { 'data-testid': 'my-nav' } },
        },
      }),
    ]);

    expect(patches.size).toBe(2);
    expect(patches.get(extensionKey('app.navigation/href', 'ok'))?.patch).toEqual({
      section: null,
      label: null,
      title: 'Valid',
    });
    expect(patches.get(extensionKey('app.navigation/href', 'ok-data'))?.patch).toEqual({
      dataAttributes: { 'data-testid': 'my-nav' },
    });
  });
});

describe('applySuppress', () => {
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let originalEnv: string | undefined;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should remove a previously registered target and drop the suppress extension', () => {
    const result = applySuppress([
      loaded({
        type: 'app.navigation/section',
        properties: { id: 'my-section', title: 'My Section' },
      }),
      loaded({
        type: SUPPRESS_EXTENSION_TYPE,
        properties: { targetType: 'app.navigation/section', targetId: 'my-section' },
      }),
    ]);

    expect(result).toHaveLength(0);
  });

  it('should treat a registration after suppress as a redefine', () => {
    const late = loaded({
      type: 'app.navigation/href',
      properties: { id: 'item', title: 'Late', href: '/x' },
    });

    const result = applySuppress([
      loaded({
        type: SUPPRESS_EXTENSION_TYPE,
        properties: { targetType: 'app.navigation/href', targetId: 'item' },
      }),
      late,
    ]);

    expect(result).toEqual([late]);
  });

  it('should keep duplicate (type, id) registrations (catalog is additive)', () => {
    const result = applySuppress([
      loaded({
        type: 'app.navigation/href',
        pluginName: 'a',
        properties: { id: 'nav', title: 'A', href: '/a' },
      }),
      loaded({
        type: 'app.navigation/href',
        pluginName: 'b',
        properties: { id: 'nav', title: 'B', href: '/b' },
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it('should allow redefine of the same (type, id) after suppress', () => {
    const replacement = loaded({
      type: 'app.navigation/href',
      pluginName: 'distribution',
      properties: { id: 'nav', title: 'Custom', href: '/new', path: '/new/*' },
    });

    const result = applySuppress([
      loaded({
        type: 'app.navigation/href',
        pluginName: 'package',
        properties: { id: 'nav', title: 'Original', href: '/old', path: '/old/*' },
      }),
      loaded({
        type: SUPPRESS_EXTENSION_TYPE,
        pluginName: 'distribution',
        properties: { targetType: 'app.navigation/href', targetId: 'nav' },
      }),
      replacement,
    ]);

    expect(result).toEqual([replacement]);
  });

  it('should drop a redefinition that precedes a later suppress for the same key', () => {
    const first = loaded({
      type: 'app.navigation/href',
      properties: { id: 'item', title: 'First', href: '/1' },
    });
    const second = loaded({
      type: 'app.navigation/href',
      properties: { id: 'item', title: 'Second', href: '/2' },
    });
    const suppress = () =>
      loaded({
        type: SUPPRESS_EXTENSION_TYPE,
        properties: { targetType: 'app.navigation/href', targetId: 'item' },
      });

    expect(applySuppress([first, suppress(), second, suppress()])).toEqual([]);
  });

  it('should not affect a different type with the same id', () => {
    const result = applySuppress([
      loaded({
        type: 'app.navigation/section',
        properties: { id: 'my-id', title: 'Section' },
      }),
      loaded({
        type: 'app.navigation/href',
        properties: { id: 'my-id', title: 'Link', href: '/link' },
      }),
      loaded({
        type: SUPPRESS_EXTENSION_TYPE,
        properties: { targetType: 'app.navigation/section', targetId: 'my-id' },
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('app.navigation/href');
  });

  it('should log when a suppress is applied in non-production', () => {
    process.env.NODE_ENV = 'development';

    applySuppress([
      loaded({
        type: 'app.navigation/section',
        properties: { id: 'sec', title: 'Section' },
      }),
      loaded({
        type: SUPPRESS_EXTENSION_TYPE,
        pluginName: 'dist',
        properties: { targetType: 'app.navigation/section', targetId: 'sec' },
      }),
    ]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('suppressed');
  });

  it('should warn and ignore suppress extensions with missing target fields', () => {
    process.env.NODE_ENV = 'development';

    const href = loaded({
      type: 'app.navigation/href',
      properties: { id: 'nav', title: 'Nav', href: '/nav' },
    });
    const result = applySuppress([
      href,
      loaded({
        type: SUPPRESS_EXTENSION_TYPE,
        properties: {},
      }),
    ]);

    expect(result).toEqual([href]);
    expect(warnSpy.mock.calls[0][0]).toContain('Invalid suppress');
  });

  it('should emit one collision warning per duplicate in non-production', () => {
    process.env.NODE_ENV = 'development';

    applySuppress([
      loaded({
        type: 'app.navigation/href',
        pluginName: 'plugin-a',
        properties: { id: 'nav', title: 'A', href: '/a' },
      }),
      loaded({
        type: 'app.navigation/href',
        pluginName: 'plugin-b',
        properties: { id: 'nav', title: 'B', href: '/b' },
      }),
      loaded({
        type: 'app.navigation/href',
        pluginName: 'plugin-c',
        properties: { id: 'nav', title: 'C', href: '/c' },
      }),
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toContain('Duplicate extension');
    expect(warnSpy.mock.calls[0][0]).toContain('Catalog stays additive');
  });

  it('should emit zero collision warnings in production', () => {
    process.env.NODE_ENV = 'production';

    applySuppress([
      loaded({
        type: 'app.navigation/href',
        pluginName: 'plugin-a',
        properties: { id: 'nav', title: 'A', href: '/a' },
      }),
      loaded({
        type: 'app.navigation/href',
        pluginName: 'plugin-b',
        properties: { id: 'nav', title: 'B', href: '/b' },
      }),
    ]);

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('applyPatches', () => {
  let warnSpy: jest.SpyInstance;
  let originalEnv: string | undefined;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('should clear section when patch value is null and set allowlisted fields', () => {
    const ext = loaded({
      type: 'app.navigation/href',
      properties: {
        id: 'item',
        title: 'Nested',
        href: '/x',
        path: '/x/*',
        section: 'my-section',
      },
    });

    const result = applyPatches(
      [ext],
      new Map([
        [
          extensionKey('app.navigation/href', 'item'),
          { patch: { section: null, group: '1_flat' }, pluginName: 'dist' },
        ],
      ]),
    );

    expect(result[0].properties.section).toBeUndefined();
    expect(result[0].properties.group).toBe('1_flat');
    expect(result[0].properties.href).toBe('/x');
    expect(result[0].properties.title).toBe('Nested');
  });

  it('should set and clear label', () => {
    const ext = loaded({
      type: 'app.navigation/href',
      properties: { id: 'item', title: 'Item', href: '/x', label: 'Old' },
    });

    const withLabel = applyPatches(
      [ext],
      new Map([
        [
          extensionKey('app.navigation/href', 'item'),
          { patch: { label: 'New' }, pluginName: 'dist' },
        ],
      ]),
    );
    expect(withLabel[0].properties.label).toBe('New');

    const cleared = applyPatches(
      withLabel,
      new Map([
        [
          extensionKey('app.navigation/href', 'item'),
          { patch: { label: null }, pluginName: 'dist' },
        ],
      ]),
    );
    expect(cleared[0].properties.label).toBeUndefined();
  });

  it('should ignore non-allowlisted patch keys with a dev warning', () => {
    process.env.NODE_ENV = 'development';

    const ext = loaded({
      type: 'app.navigation/href',
      properties: { id: 'item', title: 'Original', href: '/old' },
    });

    const result = applyPatches(
      [ext],
      new Map([
        [
          extensionKey('app.navigation/href', 'item'),
          { patch: { title: 'New', href: '/hijack' } as never, pluginName: 'dist' },
        ],
      ]),
    );

    expect(result[0].properties.title).toBe('New');
    expect(result[0].properties.href).toBe('/old');
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('non-allowlisted'))).toBe(true);
  });

  it('should warn when a patch has no matching in-use extension', () => {
    process.env.NODE_ENV = 'development';

    applyPatches(
      [],
      new Map([
        [
          extensionKey('app.navigation/section', 'sec'),
          { patch: { title: 'Nope' }, pluginName: 'dist' },
        ],
      ]),
    );

    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('no matching in-use'))).toBe(true);
  });

  it('should return the original list when there are no patches', () => {
    const exts = [
      loaded({
        type: 'app.navigation/href',
        properties: { id: 'item', title: 'Original', href: '/x' },
      }),
    ];

    expect(applyPatches(exts, new Map())).toBe(exts);
  });
});
