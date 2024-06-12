import { Artifact, Value } from '~/third_party/mlmd';
import { getArtifactProperties } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';

describe('getArtifactProperties', () => {
  const mockArtifact = new Artifact();
  mockArtifact.setId(1);
  mockArtifact.setName('artifact-1');
  mockArtifact.getCustomPropertiesMap().set('display_name', new Value());

  it('returns empty array when no custom props exist other than display_name', () => {
    const result = getArtifactProperties(mockArtifact);
    expect(result).toEqual([]);
  });

  it('returns artifact properties when custom props exist other than display_name', () => {
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
});
