import { isModelServingDeploy } from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import extensions from '../../extensions';

describe('nim-serving extensions', () => {
  it('should not opt any NIM deploy method in to DRA hardware profiles', () => {
    const deployExtensions = extensions.filter(isModelServingDeploy);

    expect(deployExtensions.map((extension) => extension.properties.platform)).toEqual(
      expect.arrayContaining(['nvidia-nim', 'nvidia-nim-service']),
    );
    deployExtensions.forEach((extension) => {
      expect(extension.properties.supportsDRAHardwareProfiles).toBeUndefined();
    });
  });
});
