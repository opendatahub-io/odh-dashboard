import { AIHubKind, KubeFastifyInstance } from '../types';
import { getModelRegistryNamespace } from '../routes/api/modelRegistries/modelRegistryUtils';
import * as resourceUtils from '../utils/resourceUtils';

describe('getModelRegistryNamespace', () => {
  const mockFastify = { log: { error: jest.fn() } } as unknown as KubeFastifyInstance;

  const mockAIHub = (instancesNamespace?: string): AIHubKind => ({
    metadata: { name: 'default-aihub' },
    spec: { instancesNamespace },
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return the namespace from AIHub spec.instancesNamespace', () => {
    jest.spyOn(resourceUtils, 'getAIHub').mockReturnValue(mockAIHub('odh-model-registries'));

    expect(getModelRegistryNamespace(mockFastify)).toBe('odh-model-registries');
  });

  it('should throw when AIHub has not reported a namespace yet', () => {
    jest.spyOn(resourceUtils, 'getAIHub').mockReturnValue(mockAIHub(undefined));

    expect(() => getModelRegistryNamespace(mockFastify)).toThrow(
      'Model registry namespace not found in AIHub spec',
    );
  });

  it('should throw when the AIHub CR itself is unavailable', () => {
    jest.spyOn(resourceUtils, 'getAIHub').mockReturnValue(undefined);

    expect(() => getModelRegistryNamespace(mockFastify)).toThrow(
      'Model registry namespace not found in AIHub spec',
    );
  });
});
