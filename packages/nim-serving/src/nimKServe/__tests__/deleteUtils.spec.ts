import {
  mockNimInferenceService,
  mockNimServingRuntime,
} from '@odh-dashboard/model-serving/__mocks__/mockLegacyNimResource';
import { NIM_CACHE_MOUNT_PATH, KSERVE_CONTAINER_NAME } from '../../constants';
import { getNIMKServePVCReference } from '../deleteUtils';

const mockServer = () => {
  const server = mockNimServingRuntime();
  server.metadata = { ...server.metadata, name: 'nim', namespace: 'project' };
  return server;
};

describe('getNIMKServePVCReference', () => {
  it('should return the cache PVC name and namespace', () => {
    const deployment = {
      modelServingPlatformId: 'kserve',
      model: mockNimInferenceService({ name: 'nim', namespace: 'project' }),
      server: mockServer(),
    };

    expect(getNIMKServePVCReference(deployment)).toEqual({
      name: expect.any(String),
      namespace: 'project',
    });
  });

  it('should return undefined when the cache mount is absent', () => {
    const server = mockServer();
    server.spec.containers = server.spec.containers.map((container) =>
      container.name === KSERVE_CONTAINER_NAME
        ? {
            ...container,
            volumeMounts: container.volumeMounts?.filter(
              (mount) => mount.mountPath !== NIM_CACHE_MOUNT_PATH,
            ),
          }
        : container,
    );

    expect(
      getNIMKServePVCReference({
        modelServingPlatformId: 'kserve',
        model: mockNimInferenceService({ name: 'nim', namespace: 'project' }),
        server,
      }),
    ).toBeUndefined();
  });

  it('should return undefined for a whitespace-only PVC name', () => {
    const server = mockServer();
    server.spec.volumes = server.spec.volumes?.map((volume) =>
      volume.persistentVolumeClaim
        ? { ...volume, persistentVolumeClaim: { claimName: '   ' } }
        : volume,
    );

    expect(
      getNIMKServePVCReference({
        modelServingPlatformId: 'kserve',
        model: mockNimInferenceService({ name: 'nim', namespace: 'project' }),
        server,
      }),
    ).toBeUndefined();
  });

  it('should return undefined when the cache volume is not a PVC', () => {
    const server = mockServer();
    server.spec.volumes = server.spec.volumes?.map((volume) =>
      volume.persistentVolumeClaim ? { name: volume.name, emptyDir: {} } : volume,
    );

    expect(
      getNIMKServePVCReference({
        modelServingPlatformId: 'kserve',
        model: mockNimInferenceService({ name: 'nim', namespace: 'project' }),
        server,
      }),
    ).toBeUndefined();
  });
});
