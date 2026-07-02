import {
  createDeployAgentWizardValidationState,
  deployAgentWizardStepRegistry,
  isDeployAgentWizardStepAccessible,
  isDeployAgentWizardStepValid,
} from '~/app/deployWizard/deployAgentWizardValidation';
import { createInitialFormData } from '~/app/deployWizard/useAgentDeployWizard';

describe('deployAgentWizardValidation', () => {
  describe('createDeployAgentWizardValidationState', () => {
    it('requires valid image selection on step 1', () => {
      const state = createDeployAgentWizardValidationState(createInitialFormData('team1'));

      expect(state.isImageSelectionValid).toBe(false);
      expect(state.isDeployFormValid).toBe(false);
    });

    it('requires valid configuration on step 2', () => {
      const state = createDeployAgentWizardValidationState({
        ...createInitialFormData('team1'),
        containerImage: 'quay.io/myorg/my-agent',
        imageTag: 'latest',
        agentName: 'my-agent',
        workloadType: '',
      });

      expect(state.isImageSelectionValid).toBe(true);
      expect(state.isConfigurationValid).toBe(false);
    });

    it('validates persistent volume size when enabled', () => {
      const state = createDeployAgentWizardValidationState({
        ...createInitialFormData('team1'),
        containerImage: 'quay.io/myorg/my-agent',
        imageTag: 'latest',
        agentName: 'my-agent',
        protocol: 'a2a',
        workloadType: 'deployment',
        enablePersistentStorage: true,
        persistentVolumeSize: 'invalid',
      });

      expect(state.isConfigurationValid).toBe(false);
    });
  });

  describe('step registry helpers', () => {
    const completeState = createDeployAgentWizardValidationState({
      ...createInitialFormData('team1'),
      containerImage: 'quay.io/myorg/my-agent',
      imageTag: 'latest',
      agentName: 'my-agent',
      protocol: 'a2a',
      workloadType: 'deployment',
    });

    const imageOnlyState = createDeployAgentWizardValidationState({
      ...createInitialFormData('team1'),
      containerImage: 'quay.io/myorg/my-agent',
      imageTag: 'latest',
      agentName: 'my-agent',
    });

    it('allows step 1 navigation without prior steps', () => {
      expect(
        isDeployAgentWizardStepAccessible(1, imageOnlyState, deployAgentWizardStepRegistry),
      ).toBe(true);
    });

    it('blocks step 2 until image selection is valid', () => {
      const emptyState = createDeployAgentWizardValidationState(createInitialFormData('team1'));

      expect(isDeployAgentWizardStepAccessible(2, emptyState, deployAgentWizardStepRegistry)).toBe(
        false,
      );
      expect(
        isDeployAgentWizardStepAccessible(2, imageOnlyState, deployAgentWizardStepRegistry),
      ).toBe(true);
    });

    it('blocks step 3 until configuration is valid', () => {
      expect(
        isDeployAgentWizardStepAccessible(3, imageOnlyState, deployAgentWizardStepRegistry),
      ).toBe(false);
      expect(
        isDeployAgentWizardStepAccessible(3, completeState, deployAgentWizardStepRegistry),
      ).toBe(true);
    });

    it('uses per-step validators for Next button state', () => {
      expect(isDeployAgentWizardStepValid(1, imageOnlyState, deployAgentWizardStepRegistry)).toBe(
        true,
      );
      expect(isDeployAgentWizardStepValid(2, imageOnlyState, deployAgentWizardStepRegistry)).toBe(
        false,
      );
      expect(isDeployAgentWizardStepValid(2, completeState, deployAgentWizardStepRegistry)).toBe(
        true,
      );
      expect(isDeployAgentWizardStepValid(6, completeState, deployAgentWizardStepRegistry)).toBe(
        true,
      );
    });

    it('rejects out-of-range step indexes', () => {
      expect(
        isDeployAgentWizardStepAccessible(0, completeState, deployAgentWizardStepRegistry),
      ).toBe(false);
      expect(
        isDeployAgentWizardStepAccessible(
          deployAgentWizardStepRegistry.length + 1,
          completeState,
          deployAgentWizardStepRegistry,
        ),
      ).toBe(false);
      expect(isDeployAgentWizardStepValid(0, completeState, deployAgentWizardStepRegistry)).toBe(
        false,
      );
      expect(
        isDeployAgentWizardStepValid(
          deployAgentWizardStepRegistry.length + 1,
          completeState,
          deployAgentWizardStepRegistry,
        ),
      ).toBe(false);
    });
  });
});
