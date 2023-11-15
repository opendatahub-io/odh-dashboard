import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { assembleServingRuntime } from '~/api/k8s/servingRuntimes';
import { ServingRuntimeKind } from '~/k8sTypes';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

describe('assembleServingRuntime', () => {
  it('should omit enable-xxxx annotations when creating', async () => {
    const servingRuntime = assembleServingRuntime(
      {
        name: 'my-serving-runtime',
        servingRuntimeTemplateName: 'ovms',
        numReplicas: 2,
        modelSize: { name: 'Small', resources: {} },
        tokens: [],
        // test false values
        externalRoute: false,
        tokenAuth: false,
      },
      'test',
      mockServingRuntimeTemplateK8sResource({}).objects[0] as ServingRuntimeKind,
      false,
      false, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe(undefined);
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe(undefined);
  });

  it('should remove enable-xxxx annotations when editing', async () => {
    const servingRuntime = assembleServingRuntime(
      {
        name: 'my-serving-runtime',
        servingRuntimeTemplateName: 'ovms',
        numReplicas: 2,
        modelSize: { name: 'Small', resources: {} },
        tokens: [],
        // test false values
        externalRoute: false,
        tokenAuth: false,
      },
      'test',
      mockServingRuntimeK8sResource({ auth: true, route: true }),
      false,
      true, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe(undefined);
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe(undefined);
  });

  it('should add enable-xxxx annotations when creating', async () => {
    const servingRuntime = assembleServingRuntime(
      {
        name: 'my-serving-runtime',
        servingRuntimeTemplateName: 'ovms',
        numReplicas: 2,
        modelSize: { name: 'Small', resources: {} },
        tokens: [],
        // test true values
        externalRoute: true,
        tokenAuth: true,
      },
      'test',
      mockServingRuntimeTemplateK8sResource({}).objects[0] as ServingRuntimeKind,
      false,
      false, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe('true');
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe('true');
  });

  it('should add enable-xxxx annotations when editing', async () => {
    const servingRuntime = assembleServingRuntime(
      {
        name: 'my-serving-runtime',
        servingRuntimeTemplateName: 'ovms',
        numReplicas: 2,
        modelSize: { name: 'Small', resources: {} },
        tokens: [],
        // test true values
        externalRoute: true,
        tokenAuth: true,
      },
      'test',
      mockServingRuntimeK8sResource({ auth: false, route: false }),
      false,
      true, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe('true');
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe('true');
  });
});
