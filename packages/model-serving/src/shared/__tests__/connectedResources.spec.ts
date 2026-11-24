import { MetadataAnnotation } from '@odh-dashboard/k8s-core';
import {
  modelServingResourceUsesResource,
  type ConnectedModelResourceReference,
} from '../utils/connectedResources';

describe('modelServingResourceUsesResource', () => {
  it('should match a connection by annotation, storage key, or image pull secret', () => {
    const resourceName = 'my-connection';
    const references: ConnectedModelResourceReference[] = [
      { annotations: { [MetadataAnnotation.ConnectionName]: resourceName } },
      { storageKey: resourceName },
      { imagePullSecrets: [{ name: resourceName }, { name: 'other-secret' }] },
      { annotations: { [MetadataAnnotation.ConnectionName]: 'other-connection' } },
    ];

    expect(
      references.map((reference) =>
        modelServingResourceUsesResource(reference, resourceName, 'connection'),
      ),
    ).toEqual([true, true, true, false]);
  });

  it('should match a PVC by the hostname in a PVC storage URI', () => {
    const reference: ConnectedModelResourceReference = {
      storageUri: 'pvc://my-pvc/models/model.bin',
    };

    expect(modelServingResourceUsesResource(reference, 'my-pvc', 'pvc')).toBe(true);
    expect(modelServingResourceUsesResource(reference, 'other-pvc', 'pvc')).toBe(false);
    expect(modelServingResourceUsesResource({}, 'my-pvc', 'pvc')).toBe(false);
  });
});
