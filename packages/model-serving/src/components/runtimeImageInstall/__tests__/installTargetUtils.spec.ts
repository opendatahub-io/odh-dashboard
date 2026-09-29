import type { RuntimeImageInstallTargetExtension } from '../../../../extension-points/runtime-image-install-target';
import { isRuntimeImageInstallTargetExtension } from '../../../../extension-points/runtime-image-install-target';
import { getAvailableInstallTargets, getUniqueInstallTarget } from '../utils';
import { mockRuntimeImageActionData } from '../mockRuntimeImageActionData';

const servingRuntimeTarget: RuntimeImageInstallTargetExtension = {
  type: 'model-serving.runtime-image/install-target',
  properties: {
    id: 'servingRuntimeTemplate',
    label: 'Serving runtime template',
    description: 'Serving runtime description',
    selectedState: {
      listName: 'Serving runtime templates',
      description: 'and the legacy deployment wizard.',
    },
    configureStepLabel: 'Configure template',
    component: () => Promise.resolve({ default: () => null }),
  },
};

const acceleratorTarget: RuntimeImageInstallTargetExtension = {
  type: 'model-serving.runtime-image/install-target',
  properties: {
    id: 'llmAcceleratorConfiguration',
    label: 'LLM accelerator configuration',
    description: 'Accelerator description',
    selectedState: {
      listName: 'LLM accelerator configurations',
      description: 'and the LLM inference service deployment wizard.',
    },
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

  it('should resolve only a single active matching target', () => {
    expect(getUniqueInstallTarget([servingRuntimeTarget], 'servingRuntimeTemplate')).toBe(
      servingRuntimeTarget,
    );
    expect(
      getUniqueInstallTarget([servingRuntimeTarget], 'llmAcceleratorConfiguration'),
    ).toBeUndefined();
    expect(
      getUniqueInstallTarget(
        [servingRuntimeTarget, servingRuntimeTarget],
        'servingRuntimeTemplate',
      ),
    ).toBeUndefined();
  });

  it('should include only unique active extensions with corresponding target data', () => {
    expect(
      getAvailableInstallTargets(actionData, [servingRuntimeTarget, acceleratorTarget]),
    ).toEqual([servingRuntimeTarget]);
    expect(
      getAvailableInstallTargets(actionData, [servingRuntimeTarget, servingRuntimeTarget]),
    ).toEqual([]);
    expect(getAvailableInstallTargets(actionData, [acceleratorTarget])).toEqual([]);
  });
});
