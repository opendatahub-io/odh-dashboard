import { Artifact, Value } from '#~/third_party/mlmd';
import {
  getArtifactModelData,
  getArtifactProperties,
} from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';

describe('getArtifactProperties', () => {
  const createMockArtifact = () => {
    const mockArtifact = new Artifact();
    mockArtifact.setId(1);
    mockArtifact.setName('artifact-1');
    mockArtifact.getCustomPropertiesMap().set('display_name', new Value());
    mockArtifact
      .getCustomPropertiesMap()
      .set('store_session_info', new Value().setStringValue('some string'));
    return mockArtifact;
  };

  it('returns empty array when no custom props exist other than display_name', () => {
    const mockArtifact = createMockArtifact();
    const result = getArtifactProperties(mockArtifact);
    expect(result).toEqual([]);
  });

  it('returns artifact properties when custom props exist other than display_name', () => {
    const mockArtifact = createMockArtifact();
    mockArtifact
      .getCustomPropertiesMap()
      .set('metric-string', new Value().setStringValue('some string'));
    mockArtifact.getCustomPropertiesMap().set('metric-int', new Value().setIntValue(10));
    mockArtifact.getCustomPropertiesMap().set('metric-double', new Value().setDoubleValue(1.1));
    mockArtifact.getCustomPropertiesMap().set('metric-bool', new Value().setBoolValue(true));

    const result = getArtifactProperties(mockArtifact);
    expect(result).toEqual([
      { name: 'metric-bool', value: 'true' },
      { name: 'metric-double', value: '1.1' },
      { name: 'metric-int', value: '10' },
      { name: 'metric-string', value: 'some string' },
    ]);
  });

  it('handles zero values correctly', () => {
    const mockArtifact = createMockArtifact();
    mockArtifact.getCustomPropertiesMap().set('metric-zero', new Value().setIntValue(0));
    mockArtifact
      .getCustomPropertiesMap()
      .set('metric-zero-double', new Value().setDoubleValue(0.0));
    mockArtifact.getCustomPropertiesMap().set('metric-false', new Value().setBoolValue(false));

    const result = getArtifactProperties(mockArtifact);
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ name: 'metric-false', value: 'false' });
    expect(result).toContainEqual({ name: 'metric-zero-double', value: '0' });
    expect(result).toContainEqual({ name: 'metric-zero', value: '0' });
  });

  it('handles undefined values gracefully', () => {
    const mockArtifact = createMockArtifact();
    // Create a Value object without setting any specific value type
    const emptyValue = new Value();
    mockArtifact.getCustomPropertiesMap().set('metric-undefined', emptyValue);

    const result = getArtifactProperties(mockArtifact);
    expect(result).toEqual([{ name: 'metric-undefined', value: '' }]);
  });
});

describe('getArtifactModelData', () => {
  const createMockArtifact = (properties: Record<string, string | undefined>): Artifact =>
    ({
      getCustomPropertiesMap: () => ({
        get: (key: string) => ({
          getStringValue: () => properties[key],
        }),
      }),
    } as Artifact);

  it('returns an empty object when artifact is undefined', () => {
    expect(getArtifactModelData(undefined)).toEqual({});
  });

  it('returns an empty object when artifact has no custom properties', () => {
    const mockArtifact = createMockArtifact({});
    expect(getArtifactModelData(mockArtifact)).toEqual({});
  });

  it('returns an object with some properties when only some exist', () => {
    const mockArtifact = createMockArtifact({ registeredModelName: 'model-1' });
    expect(getArtifactModelData(mockArtifact)).toEqual({
      registeredModelName: 'model-1',
    });
  });

  it('returns an object with all properties when all model data exist', () => {
    const mockArtifact = createMockArtifact({
      registeredModelName: 'model-1',
      modelRegistryName: 'registry-1',
      modelVersionName: 'v1',
      modelVersionId: '123',
      registeredModelId: 'reg-123',
    });
    expect(getArtifactModelData(mockArtifact)).toEqual({
      registeredModelName: 'model-1',
      modelRegistryName: 'registry-1',
      modelVersionName: 'v1',
      modelVersionId: '123',
      registeredModelId: 'reg-123',
    });
  });
});
