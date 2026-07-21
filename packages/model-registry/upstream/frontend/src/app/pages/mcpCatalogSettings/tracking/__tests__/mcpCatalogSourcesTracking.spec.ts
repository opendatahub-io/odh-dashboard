import { mockMcpCatalogSourceConfig } from '~/__mocks__';
import { McpCatalogSourceType } from '~/app/mcpServerCatalogTypes';
import { ManageMcpSourceFormData } from '~/app/pages/mcpCatalogSettings/useManageMcpSourceData';
import {
  countCustomMcpSources,
  countEnabledMcpSources,
  encodeMcpFieldsModified,
  getMcpFieldsModified,
  getMcpPreloadedTier,
  getMcpServerVisibilityType,
  getMcpServerVisibilityTypeFromForm,
  getMcpTrackingSourceType,
  hasMcpSourceValidationErrors,
  hasMcpVisibilityFilters,
} from '~/app/pages/mcpCatalogSettings/tracking/mcpCatalogSourcesTracking';

const baseFormData: ManageMcpSourceFormData = {
  name: 'Custom source',
  id: 'custom_source',
  sourceType: McpCatalogSourceType.YAML,
  yamlContent: 'source: test',
  includedServers: '',
  excludedServers: '',
  enabled: true,
  isDefault: false,
};

describe('getMcpTrackingSourceType', () => {
  it('should map default sources to preloaded', () => {
    expect(getMcpTrackingSourceType({ isDefault: true })).toBe('preloaded');
  });

  it('should map non-default sources to custom', () => {
    expect(getMcpTrackingSourceType({ isDefault: false })).toBe('custom');
    expect(getMcpTrackingSourceType({})).toBe('custom');
  });
});

describe('getMcpPreloadedTier', () => {
  it('should return undefined for custom sources', () => {
    expect(
      getMcpPreloadedTier({
        isDefault: false,
        yamlCatalogPath: 'community-mcp-servers.yaml',
      }),
    ).toBeUndefined();
  });

  it('should derive red_hat_validated from redhat path', () => {
    expect(
      getMcpPreloadedTier({
        isDefault: true,
        yamlCatalogPath: 'redhat-mcp-servers-catalog.yaml',
      }),
    ).toBe('red_hat_validated');
  });

  it('should derive community from path', () => {
    expect(
      getMcpPreloadedTier({
        isDefault: true,
        yamlCatalogPath: 'community-mcp-servers.yaml',
      }),
    ).toBe('community');
  });

  it('should derive partner from labels', () => {
    expect(
      getMcpPreloadedTier({
        isDefault: true,
        labels: ['partner_mcp_servers'],
      }),
    ).toBe('partner');
  });
});

describe('getMcpServerVisibilityType', () => {
  it('should return all when no filters', () => {
    expect(getMcpServerVisibilityType([], [])).toBe('all');
    expect(getMcpServerVisibilityType(undefined, undefined)).toBe('all');
  });

  it('should return filtered when include or exclude filters exist', () => {
    expect(getMcpServerVisibilityType(['a'], [])).toBe('filtered');
    expect(getMcpServerVisibilityType([], ['b'])).toBe('filtered');
  });
});

describe('getMcpServerVisibilityTypeFromForm', () => {
  it('should parse comma-separated filter strings', () => {
    expect(
      getMcpServerVisibilityTypeFromForm({
        includedServers: ' Kubernetes , GitHub ',
        excludedServers: '',
      }),
    ).toBe('filtered');
    expect(hasMcpVisibilityFilters({ includedServers: '', excludedServers: '' })).toBe(false);
  });
});

describe('getMcpFieldsModified', () => {
  it('should detect modified fields against existing data', () => {
    const existing: Partial<ManageMcpSourceFormData> = {
      name: 'Old',
      yamlContent: 'old yaml',
      includedServers: '',
      excludedServers: '',
      enabled: true,
    };
    const formData: ManageMcpSourceFormData = {
      ...baseFormData,
      name: 'New',
      yamlContent: 'new yaml',
      includedServers: 'a',
      enabled: false,
    };

    expect(getMcpFieldsModified(formData, existing)).toEqual([
      'name',
      'yaml',
      'visibility',
      'enabled',
    ]);
    expect(encodeMcpFieldsModified(getMcpFieldsModified(formData, existing))).toBe(
      'name,yaml,visibility,enabled',
    );
  });

  it('should return empty when nothing changed', () => {
    expect(getMcpFieldsModified(baseFormData, baseFormData)).toEqual([]);
  });
});

describe('count helpers', () => {
  const configs = [
    mockMcpCatalogSourceConfig({ id: 'a', isDefault: true, enabled: true }),
    mockMcpCatalogSourceConfig({ id: 'b', isDefault: false, enabled: false }),
    mockMcpCatalogSourceConfig({ id: 'c', isDefault: false, enabled: true }),
  ];

  it('should count custom and enabled sources', () => {
    expect(countCustomMcpSources(configs)).toBe(2);
    expect(countEnabledMcpSources(configs)).toBe(2);
  });

  it('should detect validation errors on enabled custom sources', () => {
    expect(
      hasMcpSourceValidationErrors(configs, [
        { id: 'a', status: 'error' },
        { id: 'c', status: 'error' },
      ]),
    ).toBe(true);
    expect(
      hasMcpSourceValidationErrors(configs, [
        { id: 'a', status: 'error' },
        { id: 'b', status: 'error' },
        { id: 'c', status: 'available' },
      ]),
    ).toBe(false);
  });
});
