import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { mockDeploymentWizardState } from '../../../__tests__/mockUtils';
import ModelDeploymentWizard, { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';
import { useModelDeploymentWizard } from '../useDeploymentWizard';
import { useModelDeploymentWizardValidation } from '../useDeploymentWizardValidation';
import { useModelDeploymentSubmit } from '../deploying/useModelDeploymentSubmit';
import { useYamlViewSession } from '../yaml/useYamlViewSession';
import { useFormYamlResources } from '../yaml/useYamlResourcesResult';
import { useFormToResourcesTransformer } from '../yaml/useFormToResourcesTransformer';
import { useExitDeploymentWizard } from '../exitModal/useExitDeploymentWizard';

jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  Wizard: ({ footer }: { footer: React.ReactNode }) => <div>{footer}</div>,
  useWizardContext: () => ({
    activeStep: { index: 1 },
    steps: [{}],
    goToNextStep: jest.fn(),
    goToPrevStep: jest.fn(),
    close: jest.fn(),
  }),
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../ExternalDataLoader', () => ({
  ...jest.requireActual('../ExternalDataLoader'),
  ExternalDataLoader: () => null,
}));
jest.mock('../useDeploymentWizard');
jest.mock('../useDeploymentWizardValidation');
jest.mock('../deploying/useModelDeploymentSubmit');
jest.mock('../yaml/useYamlViewSession');
jest.mock('../yaml/useYamlResourcesResult');
jest.mock('../yaml/useFormToResourcesTransformer');
jest.mock('../yaml/DeploymentWizardYAMLView', () => ({ DeploymentWizardYAMLView: () => null }));
jest.mock('../yaml/DeploymentWizardViewModeToggle', () => ({
  DeploymentWizardViewModeToggle: () => null,
}));
jest.mock('../exitModal/useExitDeploymentWizard');
jest.mock('../useRefreshWizardPage');

const mockSubmit = (loading: boolean, methodAvailable = true) => {
  jest.mocked(useModelDeploymentSubmit).mockReturnValue({
    onSave: jest.fn(),
    isLoading: false,
    isReady: !loading && methodAvailable,
    isReadinessLoading: loading,
    submitError: null,
    clearSubmitError: jest.fn(),
  });
};

describe('ModelDeploymentWizard submit readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useModelDeploymentWizard).mockReturnValue(mockDeploymentWizardState());
    jest.mocked(useModelDeploymentWizardValidation).mockReturnValue({
      isAllValid: true,
    } as ReturnType<typeof useModelDeploymentWizardValidation>);
    jest.mocked(useExitDeploymentWizard).mockReturnValue({
      isExitModalOpen: false,
      openExitModal: jest.fn(),
      closeExitModal: jest.fn(),
      handleExitConfirm: jest.fn(),
      exitWizardOnSubmit: jest.fn(),
    });
    jest.mocked(useFormToResourcesTransformer).mockReturnValue({
      resources: {},
    } as ReturnType<typeof useFormToResourcesTransformer>);
    jest.mocked(useFormYamlResources).mockReturnValue({
      yaml: 'kind: LLMInferenceService',
      setYaml: jest.fn(),
      resources: {},
    });
  });

  it.each<ModelDeploymentWizardViewMode>(['form', 'yaml-edit'])(
    'should allow %s submission to surface a missing-method error after loading completes',
    (viewMode) => {
      jest.mocked(useYamlViewSession).mockReturnValue({
        viewMode,
        isYAMLViewerEnabled: true,
        isAutoFallback: false,
        switchToForm: jest.fn(),
        switchToYaml: jest.fn(),
      });
      mockSubmit(false, false);
      render(<ModelDeploymentWizard title="Deploy" primaryButtonText="Deploy model" />);
      expect(screen.getByTestId('wizard-submit-button')).toBeEnabled();
    },
  );

  it.each<ModelDeploymentWizardViewMode>(['form', 'yaml-preview', 'yaml-edit'])(
    'should disable actual %s submit until extensions finish loading',
    (viewMode) => {
      jest.mocked(useYamlViewSession).mockReturnValue({
        viewMode,
        isYAMLViewerEnabled: true,
        isAutoFallback: false,
        switchToForm: jest.fn(),
        switchToYaml: jest.fn(),
      });
      mockSubmit(true);
      const view = <ModelDeploymentWizard title="Deploy" primaryButtonText="Deploy model" />;
      const { rerender } = render(view);
      expect(screen.getByTestId('wizard-submit-button')).toBeDisabled();
      mockSubmit(false);
      rerender(<ModelDeploymentWizard title="Deploy" primaryButtonText="Deploy model" />);
      expect(screen.getByTestId('wizard-submit-button')).toBeEnabled();
      if (viewMode !== 'form') {
        fireEvent.click(screen.getByTestId('wizard-submit-button'));
        expect(
          jest.mocked(useModelDeploymentSubmit).mock.results.at(-1)?.value.onSave,
        ).toHaveBeenCalled();
      }
    },
  );
});
