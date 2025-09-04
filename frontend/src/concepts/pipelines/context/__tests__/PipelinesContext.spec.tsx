import { getPipelineServerName } from '#~/concepts/pipelines/context/PipelinesContext';
import { ProjectKind } from '#~/k8sTypes';

// Mock the k8s utils function
jest.mock('#~/concepts/k8s/utils', () => ({
  getDisplayNameFromK8sResource: jest.fn(),
}));

import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

const mockGetDisplayNameFromK8sResource = getDisplayNameFromK8sResource as jest.MockedFunction<
  typeof getDisplayNameFromK8sResource
>;

describe('getPipelineServerName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default name when no project is provided', () => {
    const result = getPipelineServerName();
    expect(result).toBe('pipeline server');
  });

  it('should return default name when project is undefined', () => {
    const result = getPipelineServerName(undefined);
    expect(result).toBe('pipeline server');
  });

  it('should return default name when project is null', () => {
    const result = getPipelineServerName(null as unknown as ProjectKind);
    expect(result).toBe('pipeline server');
  });

  it('should return project display name with pipeline server suffix when project has display name', () => {
    const mockProject: ProjectKind = {
      apiVersion: 'v1',
      kind: 'Project',
      metadata: {
        name: 'test-project',
        annotations: {
          'openshift.io/display-name': 'My Test Project',
        },
      },
    };

    mockGetDisplayNameFromK8sResource.mockReturnValue('My Test Project');

    const result = getPipelineServerName(mockProject);
    expect(result).toBe('My Test Project pipeline server');
    expect(mockGetDisplayNameFromK8sResource).toHaveBeenCalledWith(mockProject);
  });

  it('should return default name when getDisplayNameFromK8sResource returns empty string', () => {
    const mockProject: ProjectKind = {
      apiVersion: 'v1',
      kind: 'Project',
      metadata: {
        name: 'test-project',
      },
    };

    mockGetDisplayNameFromK8sResource.mockReturnValue('');

    const result = getPipelineServerName(mockProject);
    expect(result).toBe('pipeline server');
    expect(mockGetDisplayNameFromK8sResource).toHaveBeenCalledWith(mockProject);
  });

  it('should return default name when getDisplayNameFromK8sResource returns null', () => {
    const mockProject: ProjectKind = {
      apiVersion: 'v1',
      kind: 'Project',
      metadata: {
        name: 'test-project',
      },
    };

    mockGetDisplayNameFromK8sResource.mockReturnValue(null as unknown as string);

    const result = getPipelineServerName(mockProject);
    expect(result).toBe('pipeline server');
    expect(mockGetDisplayNameFromK8sResource).toHaveBeenCalledWith(mockProject);
  });

  it('should handle special characters in display name', () => {
    const mockProject: ProjectKind = {
      apiVersion: 'v1',
      kind: 'Project',
      metadata: {
        name: 'test-project',
        annotations: {
          'openshift.io/display-name': 'Data Science & ML Project',
        },
      },
    };

    mockGetDisplayNameFromK8sResource.mockReturnValue('Data Science & ML Project');

    const result = getPipelineServerName(mockProject);
    expect(result).toBe('Data Science & ML Project pipeline server');
    expect(mockGetDisplayNameFromK8sResource).toHaveBeenCalledWith(mockProject);
  });

  it('should handle display name with only whitespace', () => {
    const mockProject: ProjectKind = {
      apiVersion: 'v1',
      kind: 'Project',
      metadata: {
        name: 'test-project',
      },
    };

    mockGetDisplayNameFromK8sResource.mockReturnValue('   ');

    const result = getPipelineServerName(mockProject);
    expect(result).toBe('    pipeline server'); // Preserves whitespace as the function checks for truthy, not trimmed
  });

  it('should handle very long display names', () => {
    const longDisplayName = 'A'.repeat(100);
    const mockProject: ProjectKind = {
      apiVersion: 'v1',
      kind: 'Project',
      metadata: {
        name: 'test-project',
        annotations: {
          'openshift.io/display-name': longDisplayName,
        },
      },
    };

    mockGetDisplayNameFromK8sResource.mockReturnValue(longDisplayName);

    const result = getPipelineServerName(mockProject);
    expect(result).toBe(`${longDisplayName} pipeline server`);
    expect(mockGetDisplayNameFromK8sResource).toHaveBeenCalledWith(mockProject);
  });
});
