import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';
import { mockServingRuntimeTemplateK8sResource } from '../../../__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  filterTemplatesByModelType,
  findTemplateForSelection,
  mergeProjectAndGlobalTemplates,
} from '../templateUtils';

jest.mock('@odh-dashboard/model-serving/shared', () => {
  const actual = jest.requireActual('@odh-dashboard/model-serving/shared');
  return {
    ...actual,
    getServingRuntimeNameFromTemplate: (template: TemplateKind) =>
      template.objects[0]?.metadata?.name ?? template.metadata.name,
    getModelTypesFromTemplate: jest.fn((template: TemplateKind) => {
      const annotation = template.metadata.annotations?.['opendatahub.io/model-type'];
      if (!annotation) {
        return [];
      }
      try {
        return JSON.parse(annotation) as ServingRuntimeModelType[];
      } catch {
        return [];
      }
    }),
  };
});

jest.mock('../../versions', () => ({
  isUnsupportedUnaccepted: jest.fn(() => false),
}));

describe('mergeProjectAndGlobalTemplates', () => {
  it('should return global templates when project namespace is not distinct', () => {
    const globalTemplate = mockServingRuntimeTemplateK8sResource({ name: 'global-sr' });
    expect(mergeProjectAndGlobalTemplates([globalTemplate], [], false)).toEqual([globalTemplate]);
  });

  it('should prefer project templates when runtime names collide', () => {
    const globalTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'global-template',
      displayName: 'Global',
    });
    globalTemplate.objects[0].metadata.name = 'shared-runtime';
    const projectTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'project-template',
      displayName: 'Project',
      namespace: 'my-project',
    });
    projectTemplate.objects[0].metadata.name = 'shared-runtime';

    expect(mergeProjectAndGlobalTemplates([globalTemplate], [projectTemplate], true)).toEqual([
      projectTemplate,
    ]);
  });
});

describe('filterTemplatesByModelType', () => {
  it('should keep templates with no model-type annotation', () => {
    const template = mockServingRuntimeTemplateK8sResource({});
    expect(filterTemplatesByModelType([template], ServingRuntimeModelType.PREDICTIVE)).toEqual([
      template,
    ]);
  });

  it('should keep matching model types', () => {
    const predictive = mockServingRuntimeTemplateK8sResource({
      name: 'predictive',
      modelTypes: [ServingRuntimeModelType.PREDICTIVE],
    });
    const generative = mockServingRuntimeTemplateK8sResource({
      name: 'generative',
      modelTypes: [ServingRuntimeModelType.GENERATIVE],
    });

    expect(
      filterTemplatesByModelType([predictive, generative], ServingRuntimeModelType.PREDICTIVE),
    ).toEqual([predictive]);
  });
});

describe('findTemplateForSelection', () => {
  it('should match by template name when namespace is omitted', () => {
    const template = mockServingRuntimeTemplateK8sResource({ name: 'sr-template' });
    expect(findTemplateForSelection([template], { name: 'sr-template' })).toBe(template);
  });

  it('should match by name and namespace when both are set', () => {
    const globalTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'sr-template',
      namespace: 'opendatahub',
    });
    const projectTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'sr-template',
      namespace: 'my-project',
    });

    expect(
      findTemplateForSelection([globalTemplate, projectTemplate], {
        name: 'sr-template',
        namespace: 'my-project',
      }),
    ).toBe(projectTemplate);
  });

  it('should return undefined when no template matches', () => {
    const template = mockServingRuntimeTemplateK8sResource({ name: 'other' });
    expect(findTemplateForSelection([template], { name: 'missing' })).toBeUndefined();
  });
});
