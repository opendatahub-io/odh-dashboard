import { mockAcceleratork8sResource } from '~/__mocks__/mockAcceleratork8sResource';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimeModalData } from '~/__mocks__/mockServingRuntimeModalData';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { assembleServingRuntime } from '~/api/k8s/servingRuntimes';
import { ServingRuntimeKind } from '~/k8sTypes';
import { AcceleratorState } from '~/utilities/useAcceleratorState';

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

describe('assembleServingRuntime', () => {
  it('should omit enable-xxxx annotations when creating', async () => {
    const servingRuntime = assembleServingRuntime(
      mockServingRuntimeModalData({
        externalRoute: false,
        tokenAuth: false,
      }),
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
      mockServingRuntimeModalData({
        externalRoute: false,
        tokenAuth: false,
      }),
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
      mockServingRuntimeModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
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
      mockServingRuntimeModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      'test',
      mockServingRuntimeK8sResource({ auth: false, route: false }),
      false,
      true, // isEditing
    );

    expect(servingRuntime.metadata.annotations).toBeDefined();
    expect(servingRuntime.metadata.annotations?.['enable-auth']).toBe('true');
    expect(servingRuntime.metadata.annotations?.['enable-route']).toBe('true');
  });

  it('should add tolerations and gpu on modelmesh', async () => {
    const acceleratorState: AcceleratorState = {
      accelerator: mockAcceleratork8sResource({}),
      accelerators: [mockAcceleratork8sResource({})],
      initialAccelerator: mockAcceleratork8sResource({}),
      count: 1,
      additionalOptions: {},
      useExisting: false,
    };

    const servingRuntime = assembleServingRuntime(
      mockServingRuntimeModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      'test',
      mockServingRuntimeK8sResource({ auth: false, route: false }),
      true,
      false,
      acceleratorState,
      true,
    );

    expect(servingRuntime.spec.tolerations).toBeDefined();
    expect(servingRuntime.spec.containers[0].resources?.limits?.['nvidia.com/gpu']).toBe(1);
    expect(servingRuntime.spec.containers[0].resources?.requests?.['nvidia.com/gpu']).toBe(1);
  });

  it('should not add tolerations and gpu on kserve', async () => {
    const acceleratorState: AcceleratorState = {
      accelerator: mockAcceleratork8sResource({}),
      accelerators: [mockAcceleratork8sResource({})],
      initialAccelerator: mockAcceleratork8sResource({}),
      count: 1,
      additionalOptions: {},
      useExisting: false,
    };

    const servingRuntime = assembleServingRuntime(
      mockServingRuntimeModalData({
        externalRoute: true,
        tokenAuth: true,
      }),
      'test',
      mockServingRuntimeK8sResource({ auth: false, route: false }),
      true,
      false,
      acceleratorState,
      false,
    );

    expect(servingRuntime.spec.tolerations).toBeUndefined();
    expect(servingRuntime.spec.containers[0].resources?.limits?.['nvidia.com/gpu']).toBeUndefined();
    expect(
      servingRuntime.spec.containers[0].resources?.requests?.['nvidia.com/gpu'],
    ).toBeUndefined();
  });
});
