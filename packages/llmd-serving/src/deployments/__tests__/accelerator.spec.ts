import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import {
  applyAcceleratorConfig,
  extractAcceleratorConfig,
  preDeployAcceleratorConfig,
} from '../accelerator';
import { AcceleratorConfigFieldWizardField } from '../../wizardFields/AcceleratorConfigField';
import {
  createLLMInferenceServiceConfig,
  deleteLLMInferenceServiceConfig,
} from '../../api/LLMInferenceServiceConfigs';

import { ACCELERATOR_CONFIG_DEFAULT } from '../../const';
import {
  ACCELERATOR_CONFIG_REF_ANNOTATION,
  type LLMdDeployment,
  type LLMInferenceServiceConfigKind,
} from '../../types';
import { applyTopologyConfig } from '../topology';

jest.mock('../../api/LLMInferenceServiceConfigs');

const makeDeployment = (): LLMdDeployment => ({
  modelServingPlatformId: 'llmd-serving',
  model: {
    apiVersion: 'serving.kserve.io/v1alpha2',
    kind: 'LLMInferenceService',
    metadata: { name: 'my-deployment', namespace: 'ns', annotations: {} },
    spec: { model: { uri: '', name: 'my-deployment' }, router: { scheduler: {} } },
  },
});

const makeConfig = (name: string): LLMInferenceServiceConfigKind => ({
  apiVersion: 'serving.kserve.io/v1alpha2',
  kind: 'LLMInferenceServiceConfig',
  metadata: { name, namespace: 'dashboard', labels: {} },
});

describe('applyAcceleratorConfig', () => {
  it('adds the accelerator baseRef and annotation', () => {
    const result = applyAcceleratorConfig(makeDeployment(), {
      selectedConfig: makeConfig('rocm'),
    });
    expect(result.model.spec.baseRefs).toEqual([{ name: 'my-deployment-rocm' }]);
    expect(result.model.metadata.annotations?.[ACCELERATOR_CONFIG_REF_ANNOTATION]).toBe(
      'my-deployment-rocm',
    );
  });

  it('keeps spec.router.scheduler (stays llm-d)', () => {
    const result = applyAcceleratorConfig(makeDeployment(), {
      selectedConfig: makeConfig('rocm'),
    });
    expect(result.model.spec.router?.scheduler).toEqual({});
  });

  it('adds no baseRef for the built-in (placeholder) selection', () => {
    const result = applyAcceleratorConfig(makeDeployment(), {
      selectedConfig: ACCELERATOR_CONFIG_DEFAULT,
    });
    expect(result.model.spec.baseRefs ?? []).toEqual([]);
  });

  it('appends the accelerator ref AFTER the topology ref', () => {
    // Simulate apply order: topology first, then accelerator
    let d = applyTopologyConfig(makeDeployment(), {
      selectedConfig: makeConfig('single-node'),
    });
    d = applyAcceleratorConfig(d, { selectedConfig: makeConfig('rocm') });
    expect(d.model.spec.baseRefs).toEqual([
      { name: 'my-deployment-single-node' },
      { name: 'my-deployment-rocm' },
    ]);
  });
});

describe('extractAcceleratorConfig', () => {
  it('returns configRef from the annotation', () => {
    const d = makeDeployment();
    d.model.metadata.annotations = {
      [ACCELERATOR_CONFIG_REF_ANNOTATION]: 'my-deployment-rocm',
    };
    expect(extractAcceleratorConfig(d)).toEqual({ configRef: 'my-deployment-rocm' });
  });

  it('returns the saved built-in selection when the annotation is absent', () => {
    expect(extractAcceleratorConfig(makeDeployment())).toEqual({
      selectedConfig: ACCELERATOR_CONFIG_DEFAULT,
      autoSelect: false,
    });
  });

  it('preserves the built-in selection through edit initialization and update with multiple compatible configs', async () => {
    jest.clearAllMocks();
    const existing = makeDeployment();
    existing.model.spec.baseRefs = [{ name: 'existing-topology' }];
    const configs = ['first', 'second'].map((name) => {
      const config = makeConfig(name);
      config.metadata.annotations = {
        'opendatahub.io/recommended-accelerators': '["nvidia.com/gpu"]',
      };
      return config;
    });
    const hardwareProfile = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'nvidia.com/gpu',
          displayName: 'GPU',
          resourceType: IdentifierResourceType.ACCELERATOR,
          defaultCount: 1,
          minCount: 1,
          maxCount: 4,
        },
      ],
    });
    const fieldData = AcceleratorConfigFieldWizardField.reducerFunctions.getInitialFieldData(
      extractAcceleratorConfig(existing),
      { configs },
      { hardwareProfile },
    );
    expect(fieldData).toEqual({ selectedConfig: ACCELERATOR_CONFIG_DEFAULT, autoSelect: false });
    const updated = applyAcceleratorConfig(existing, fieldData);
    expect(updated.model.spec.baseRefs).toEqual([{ name: 'existing-topology' }]);
    expect(updated.model.metadata.annotations?.[ACCELERATOR_CONFIG_REF_ANNOTATION]).toBeUndefined();
    await preDeployAcceleratorConfig(fieldData, {} as WizardFormData['state'], updated, existing);
    expect(createLLMInferenceServiceConfig).not.toHaveBeenCalled();
    expect(deleteLLMInferenceServiceConfig).not.toHaveBeenCalled();
  });
});
