import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { NIM_PVC_ANNOTATION } from '../../../clusterStorage/clusterStorage';
import { PVCCategory, categorizePVCs } from '../nimPVCUtils';

const makePVC = (name: string, annotations: Record<string, string> = {}) =>
  mockPVCK8sResource({ name, annotations });

describe('categorizePVCs', () => {
  it('categorizes PVCs into NIM, general purpose, and model serving groups in order', () => {
    const pvcs = [
      makePVC('model-serving-pvc', { 'dashboard.opendatahub.io/model-path': '/models/foo' }),
      makePVC('general-pvc'),
      makePVC('nim-pvc', { [NIM_PVC_ANNOTATION]: 'true' }),
    ];

    expect(categorizePVCs(pvcs)).toEqual([
      { name: 'nim-pvc', subPath: undefined, category: PVCCategory.NIM },
      { name: 'general-pvc', subPath: undefined, category: PVCCategory.GENERAL },
      {
        name: 'model-serving-pvc',
        subPath: undefined,
        category: PVCCategory.MODEL_SERVING,
      },
    ]);
  });

  it('prefers NIM category when both NIM and model-path annotations are present', () => {
    const pvcs = [
      makePVC('dual-annotated', {
        [NIM_PVC_ANNOTATION]: 'true',
        'dashboard.opendatahub.io/model-path': '/models/foo',
      }),
    ];

    expect(categorizePVCs(pvcs)[0].category).toBe(PVCCategory.NIM);
  });

  it('skips PVCs without a metadata name', () => {
    const pvcs = [
      makePVC('valid-pvc'),
      { ...makePVC(''), metadata: { ...makePVC('').metadata, name: '' } },
    ];

    expect(categorizePVCs(pvcs)).toEqual([
      { name: 'valid-pvc', subPath: undefined, category: PVCCategory.GENERAL },
    ]);
  });

  it('includes subPath from the NIM PVC annotation', () => {
    const pvcs = [
      makePVC('nim-pvc', {
        [NIM_PVC_ANNOTATION]: 'true',
        'dashboard.opendatahub.io/nim-subpath': 'arctic-embed-l',
      }),
    ];

    expect(categorizePVCs(pvcs)[0].subPath).toBe('arctic-embed-l');
  });
});
