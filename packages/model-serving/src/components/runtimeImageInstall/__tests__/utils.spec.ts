import type { RuntimeImageInstallTargetExtension } from '../../../../extension-points/runtime-image-install-target';
import { isRuntimeImageInstallTargetExtension } from '../../../../extension-points/runtime-image-install-target';
import {
  getInstallTargets,
  getAvailableInstallTargets,
  getMatchingInstallTarget,
  getRuntimeImageInstallRoute,
} from '../utils';
import { mockRuntimeImageActionData } from '../../../__mocks__/mockRuntimeImageActionData';

describe('runtime image install route', () => {
  it('builds the install URL under the runtime details route', () => {
    expect(getRuntimeImageInstallRoute('runtime-1')).toBe(
      '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/runtime-1/install',
    );
  });

  it('encodes the runtime identifier in the install URL', () => {
    expect(getRuntimeImageInstallRoute('runtime / one')).toBe(
      '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/runtime%20%2F%20one/install',
    );
  });
});

const servingRuntimeTarget: RuntimeImageInstallTargetExtension = {
  type: 'model-serving.runtime-image/install-target',
  properties: {
    id: 'servingRuntimeTemplate',
    label: 'Serving runtime template',
    description: 'Serving runtime description',
    selectedState: {
      listName: 'Serving runtime templates',
      description: 'and the inference service deployment wizard.',
    },
    installTargetName: 'serving runtime template',
    configureStepLabel: 'Configure template',
    component: () => Promise.resolve({ default: () => null }),
  },
};

const acceleratorTarget: RuntimeImageInstallTargetExtension = {
  type: 'model-serving.runtime-image/install-target',
  properties: {
    id: 'llmInferenceServiceConfig',
    label: 'LLM accelerator configuration',
    description: 'Accelerator description',
    selectedState: {
      listName: 'LLM accelerator configurations',
      description: 'and the LLM inference service deployment wizard.',
    },
    installTargetName: 'LLM accelerator configuration',
    configureStepLabel: 'Configure accelerator',
    component: () => Promise.resolve({ default: () => null }),
  },
};

const actionData = {
  ...mockRuntimeImageActionData(),
  deploymentResources: {
    servingRuntimeTemplate: mockRuntimeImageActionData().deploymentResources.servingRuntimeTemplate,
  },
};

describe('install target discovery', () => {
  it('should identify only install-target extensions', () => {
    expect(isRuntimeImageInstallTargetExtension(servingRuntimeTarget)).toBe(true);
    expect(isRuntimeImageInstallTargetExtension({ type: 'core.action', properties: {} })).toBe(
      false,
    );
  });

  it('should resolve the first active matching target', () => {
    expect(getMatchingInstallTarget([servingRuntimeTarget], 'servingRuntimeTemplate')).toBe(
      servingRuntimeTarget,
    );
    expect(
      getMatchingInstallTarget([servingRuntimeTarget], 'llmInferenceServiceConfig'),
    ).toBeUndefined();
    expect(
      getMatchingInstallTarget(
        [servingRuntimeTarget, servingRuntimeTarget],
        'servingRuntimeTemplate',
      ),
    ).toBe(servingRuntimeTarget);
  });

  it('should retain all valid contributed options independently of resource data', () => {
    expect(
      getInstallTargets([servingRuntimeTarget, servingRuntimeTarget, acceleratorTarget]),
    ).toEqual([servingRuntimeTarget, acceleratorTarget]);
    const invalidTarget = {
      ...servingRuntimeTarget,
      properties: { ...servingRuntimeTarget.properties, component: undefined },
    } as unknown as RuntimeImageInstallTargetExtension;
    expect(getInstallTargets([invalidTarget, servingRuntimeTarget])).toEqual([
      servingRuntimeTarget,
    ]);
    expect(getInstallTargets([invalidTarget])).toEqual([]);
  });

  it('should filter resolved targets by corresponding resource data', () => {
    expect(
      getAvailableInstallTargets(actionData, [servingRuntimeTarget, acceleratorTarget]),
    ).toEqual([servingRuntimeTarget]);
    expect(
      getAvailableInstallTargets(mockRuntimeImageActionData(), [
        servingRuntimeTarget,
        acceleratorTarget,
      ]),
    ).toEqual([servingRuntimeTarget, acceleratorTarget]);
    expect(
      getAvailableInstallTargets(
        actionData,
        getInstallTargets([servingRuntimeTarget, servingRuntimeTarget]),
      ),
    ).toEqual([servingRuntimeTarget]);
    expect(getAvailableInstallTargets(actionData, [acceleratorTarget])).toEqual([]);
  });
});
