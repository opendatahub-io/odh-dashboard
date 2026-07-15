import { renderHook } from '@testing-library/react';
import { deployAgentWizardStepRegistry } from '~/app/deployWizard/deployAgentWizardValidation';
import { useAgentDeployWizardValidation } from '~/app/deployWizard/useAgentDeployWizardValidation';
import { createInitialFormData } from '~/app/deployWizard/useAgentDeployWizard';

describe('useAgentDeployWizardValidation', () => {
  it('requires valid image selection on step 1', () => {
    const formData = createInitialFormData('team1');
    const { result } = renderHook(() => useAgentDeployWizardValidation(formData));

    expect(result.current.isImageSelectionValid).toBe(false);
    expect(result.current.isNextStepDisabled(1)).toBe(true);
    expect(result.current.isStepAccessible(1)).toBe(true);
    expect(result.current.isStepAccessible(2)).toBe(false);
  });

  it('requires valid configuration on step 2 when protocol is cleared', () => {
    const formData = {
      ...createInitialFormData('team1'),
      containerImage: 'quay.io/myorg/my-agent',
      imageTag: 'latest',
      agentName: 'my-agent',
      protocol: '',
    };
    const { result } = renderHook(() => useAgentDeployWizardValidation(formData));

    expect(result.current.isImageSelectionValid).toBe(true);
    expect(result.current.isConfigurationValid).toBe(false);
    expect(result.current.isNextStepDisabled(2)).toBe(true);
    expect(result.current.isStepAccessible(3)).toBe(false);
  });

  it('enables configuration step with default sandbox workload', () => {
    const formData = {
      ...createInitialFormData('team1'),
      containerImage: 'quay.io/myorg/my-agent',
      imageTag: 'latest',
      agentName: 'my-agent',
    };
    const { result } = renderHook(() => useAgentDeployWizardValidation(formData));

    expect(result.current.isConfigurationValid).toBe(true);
    expect(result.current.isNextStepDisabled(2)).toBe(false);
  });

  it('uses the shared step registry', () => {
    expect(deployAgentWizardStepRegistry).toHaveLength(5);
    expect(deployAgentWizardStepRegistry[0].name).toBe('Image selection');
    expect(deployAgentWizardStepRegistry[4].name).toBe('Summary');
  });
});
