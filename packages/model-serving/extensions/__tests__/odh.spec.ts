import { NamespaceApplicationCase } from '@odh-dashboard/k8s-core';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import extensions from '../odh';
import type { ModelServingPlatformExtension } from '../../extension-points';

describe('Model serving shared platform extensions', () => {
  const platforms = extensions.filter(
    (extension): extension is ModelServingPlatformExtension =>
      extension.type === 'model-serving.platform',
  );
  const [platform] = platforms;

  it('should register the shared single-model platform shell independently of KServe', () => {
    expect(platforms).toHaveLength(1);
    expect(platform.properties).toEqual(
      expect.objectContaining({
        id: 'kserve',
        manage: expect.objectContaining({
          namespaceApplicationCase: NamespaceApplicationCase.KSERVE_PROMOTION,
          priority: 0,
          default: true,
          projectRequirements: {
            labels: {
              'modelmesh-enabled': 'false',
            },
          },
        }),
        enableCardText: expect.objectContaining({
          objectType: ProjectObjectType.singleModel,
        }),
      }),
    );
    expect(platform.flags).toEqual({
      required: [SupportedArea.MODEL_SERVING],
    });
  });
});
