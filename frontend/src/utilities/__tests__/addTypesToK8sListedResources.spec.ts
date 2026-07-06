import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { addTypesToK8sListedResources } from '#~/utilities/addTypesToK8sListedResources';

const servingRuntimeTemplate = {
  apiVersion: 'template.openshift.io/v1',
  kind: 'TemplateList',
  items: [
    {
      metadata: {
        name: 'test-model',
        annotations: {
          'openshift.io/display-name': 'New OVMS Server',
        },
        labels: {
          'opendatahub.io/dashboard': 'true',
        },
      },
    },
  ],
  metadata: {
    resourceVersion: '24348645',
    continue: '',
  },
};

describe('addTypesToK8sListedResources', () => {
  it('should have apiVersion and kind as Template', () => {
    const list = addTypesToK8sListedResources(servingRuntimeTemplate, 'Template');
    expect(list).not.toBe(servingRuntimeTemplate);
    expect(list.items).toHaveLength(servingRuntimeTemplate.items.length);
    list.items.forEach((i: Partial<K8sResourceCommon>) => {
      expect(i.apiVersion).toBe('template.openshift.io/v1');
      expect(i.kind).toBe('Template');
    });
  });
});
