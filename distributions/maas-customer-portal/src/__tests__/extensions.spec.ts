import { PluginStore } from '@odh-dashboard/plugin-core';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import {
  SUPPRESS_EXTENSION_TYPE,
  PATCH_EXTENSION_TYPE,
} from '@odh-dashboard/plugin-core/extension-points';
import localExtensions from '../extensions';

// Package portal extension modules use package-local `~/` imports that Jest/tsc
// cannot resolve from this distribution. Fixtures mirror the (type, id) contract.
const mockGenAiExtensions: Extension[] = [
  {
    type: 'app.navigation/section',
    flags: { required: ['plugin-gen-ai'] },
    properties: {
      id: 'gen-ai-studio',
      title: 'Gen AI studio',
      group: '4_gen_ai_studio',
    },
  },
  {
    type: 'app.navigation/href',
    flags: { required: ['chatPlayground'] },
    properties: {
      id: 'chat-playground',
      title: 'Playground',
      href: '/gen-ai-studio/playground',
      path: '/gen-ai-studio/playground/*',
      section: 'gen-ai-studio',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.navigation/href',
    flags: { required: ['plugin-gen-ai'] },
    properties: {
      id: 'ai-assets',
      title: 'AI asset endpoints',
      href: '/gen-ai-studio/assets',
      path: '/gen-ai-studio/assets/*',
      section: 'gen-ai-studio',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: { required: ['plugin-gen-ai'] },
    properties: {
      path: '/gen-ai-studio/*',
      component: jest.fn(),
    },
  },
];

const mockMaasExtensions: Extension[] = [
  {
    type: 'app.area',
    properties: {
      id: 'modelAsService',
      featureFlags: ['modelAsService'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: { required: ['modelAsService'] },
    properties: {
      id: 'maas-tokens-subscriptions-view',
      title: 'API keys',
      href: '/maas/keys-and-subs',
      section: 'gen-ai-studio',
      path: '/maas/keys-and-subs/*',
    },
  },
  {
    type: 'app.route',
    flags: { required: ['modelAsService'] },
    properties: {
      path: '/maas/keys-and-subs/*',
      component: jest.fn(),
    },
  },
];

const buildCatalog = (): Record<string, Extension[]> => ({
  '@odh-dashboard/maas': mockMaasExtensions,
  '@odh-dashboard/gen-ai': mockGenAiExtensions,
  'maas-customer-portal': localExtensions,
});

describe('MaaS Consumer Portal extensions', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const enablePortalFlags = (store: PluginStore): void => {
    store.setFeatureFlags({
      modelAsService: true,
      genAiStudio: true,
      'plugin-gen-ai': true,
      chatPlayground: true,
    });
  };

  it('should produce no orphaned nav items under suppressed or absent sections', () => {
    const store = new PluginStore(buildCatalog());
    enablePortalFlags(store);

    const exts = store.getExtensions();

    const sectionIds = new Set(
      exts.filter((e) => e.type === 'app.navigation/section').map((e) => e.properties.id as string),
    );

    const orphaned = exts.filter((e) => {
      const { section } = e.properties;
      return typeof section === 'string' && !sectionIds.has(section);
    });

    expect(orphaned).toHaveLength(0);
  });

  it('should have chat-playground, ai-assets, and API keys at top level (no section)', () => {
    const store = new PluginStore(buildCatalog());
    enablePortalFlags(store);

    const exts = store.getExtensions();

    const playground = exts.find(
      (e) => e.type === 'app.navigation/href' && e.properties.id === 'chat-playground',
    );
    const aiAssets = exts.find(
      (e) => e.type === 'app.navigation/href' && e.properties.id === 'ai-assets',
    );
    const apiKeys = exts.find(
      (e) =>
        e.type === 'app.navigation/href' && e.properties.id === 'maas-tokens-subscriptions-view',
    );

    expect(playground).toBeDefined();
    expect(playground?.properties.section).toBeUndefined();
    expect(playground?.properties.group).toBe('2_playground');
    expect(playground?.properties.label).toBeUndefined();
    expect(playground?.properties.href).toBe('/gen-ai-studio/playground');

    expect(aiAssets).toBeDefined();
    expect(aiAssets?.properties.section).toBeUndefined();
    expect(aiAssets?.properties.group).toBe('3_ai_assets');
    expect(aiAssets?.properties.label).toBeUndefined();

    expect(apiKeys).toBeDefined();
    expect(apiKeys?.properties.section).toBeUndefined();
    expect(apiKeys?.properties.group).toBe('1_api_keys');
    expect(apiKeys?.properties.title).toBe('API keys');
  });

  it('should not contain the gen-ai-studio section', () => {
    const store = new PluginStore(buildCatalog());
    enablePortalFlags(store);

    const exts = store.getExtensions();

    const genAiSection = exts.find(
      (e) => e.type === 'app.navigation/section' && e.properties.id === 'gen-ai-studio',
    );

    expect(genAiSection).toBeUndefined();
  });

  it('should fail if a future upstream nav item references a suppressed section', () => {
    const futureExtensions: Extension[] = [
      ...mockGenAiExtensions,
      {
        type: 'app.navigation/href',
        flags: { required: ['plugin-gen-ai'] },
        properties: {
          id: 'future-item',
          title: 'Future Feature',
          href: '/gen-ai-studio/future',
          section: 'gen-ai-studio',
        },
      },
    ];

    const catalog: Record<string, Extension[]> = {
      '@odh-dashboard/maas': mockMaasExtensions,
      '@odh-dashboard/gen-ai': futureExtensions,
      'maas-customer-portal': localExtensions,
    };

    const store = new PluginStore(catalog);
    enablePortalFlags(store);

    const exts = store.getExtensions();

    const sectionIds = new Set(
      exts.filter((e) => e.type === 'app.navigation/section').map((e) => e.properties.id as string),
    );

    const orphaned = exts.filter((e) => {
      const { section } = e.properties;
      return typeof section === 'string' && !sectionIds.has(section);
    });

    // This test documents expected behavior: the future item IS orphaned
    // because gen-ai-studio section is suppressed. The MaaS distribution
    // maintainer must suppress, patch, or reassign this item.
    expect(orphaned.length).toBeGreaterThan(0);
    expect(orphaned[0].properties.id).toBe('future-item');
  });

  it('should not include suppress or patch extensions in visible output', () => {
    const store = new PluginStore(buildCatalog());
    enablePortalFlags(store);

    const exts = store.getExtensions();
    expect(exts.filter((e) => e.type === SUPPRESS_EXTENSION_TYPE)).toHaveLength(0);
    expect(exts.filter((e) => e.type === PATCH_EXTENSION_TYPE)).toHaveLength(0);
  });
});
