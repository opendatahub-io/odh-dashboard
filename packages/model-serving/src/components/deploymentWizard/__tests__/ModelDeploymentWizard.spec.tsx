import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { stringify } from 'yaml';
import { mockDeploymentWizardState } from '../../../__tests__/mockUtils';
import ModelDeploymentWizard, { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';
import { useModelDeploymentWizard } from '../useDeploymentWizard';
import { useModelDeploymentWizardValidation } from '../useDeploymentWizardValidation';
import { useModelDeploymentSubmit } from '../deploying/useModelDeploymentSubmit';
import { useYamlViewSession } from '../yaml/useYamlViewSession';
import { useFormYamlResources } from '../yaml/useYamlResourcesResult';
import { useFormToResourcesTransformer } from '../yaml/useFormToResourcesTransformer';
import { useExitDeploymentWizard } from '../exitModal/useExitDeploymentWizard';
import type { DeploymentWizardViewModeToggle } from '../yaml/DeploymentWizardViewModeToggle';
import type { Deployment, ModelResourceType } from '../../../../extension-points';
import type { InitialWizardFormData } from '../../../shared/types/form-data';

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
  ApplicationsPage: ({
    children,
    headerAction,
  }: {
    children: React.ReactNode;
    headerAction?: React.ReactNode;
  }) => (
    <div>
      {children}
      {headerAction}
    </div>
  ),
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
jest.mock('../yaml/lazyDeploymentWizardYAMLView', () => ({
  DeploymentWizardYAMLView: () => null,
}));
jest.mock('../yaml/DeploymentWizardViewModeToggle', () => ({
  DeploymentWizardViewModeToggle: (props: ToggleProps) => <MockViewModeToggle {...props} />,
}));
jest.mock('../exitModal/useExitDeploymentWizard');
jest.mock('../useRefreshWizardPage');

type ToggleProps = React.ComponentProps<typeof DeploymentWizardViewModeToggle>;

// The toggle renders inside the keyed form, so its mount count tracks form remounts
const mockToggle: { props?: ToggleProps; mounts: number } = { mounts: 0 };
const MockViewModeToggle: React.FC<ToggleProps> = (props) => {
  mockToggle.props = props;
  React.useEffect(() => {
    mockToggle.mounts += 1;
  }, []);
  return null;
};

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
      loaded: true,
      errors: [],
    });
    jest.mocked(useFormYamlResources).mockReturnValue({
      yaml: { yaml: 'kind: LLMInferenceService' },
      setYaml: jest.fn(),
      reinitYamlFromResources: jest.fn(),
      resources: { resources: {} },
      yamlSubmitErrors: [],
      yamlToFormErrors: [],
    });
  });

  it.each<ModelDeploymentWizardViewMode>(['form', 'yaml-edit'])(
    'should allow %s submission to surface a missing-method error after loading completes',
    (viewMode) => {
      jest.mocked(useYamlViewSession).mockReturnValue({
        viewMode,
        isYAMLViewerEnabled: true,
        isAutoFallback: false,
        lastUpdatedSource: 'form',
        setLastUpdatedSource: jest.fn(),
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
        lastUpdatedSource: 'form',
        setLastUpdatedSource: jest.fn(),
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

  it('should not show the form toggle as loading once yaml extraction settles', () => {
    jest.mocked(useYamlViewSession).mockReturnValue({
      viewMode: 'yaml-edit',
      isYAMLViewerEnabled: true,
      isAutoFallback: true,
      lastUpdatedSource: 'yaml-edit',
      setLastUpdatedSource: jest.fn(),
      switchToForm: jest.fn(),
      switchToYaml: jest.fn(),
    });
    const view = <ModelDeploymentWizard title="Deploy" primaryButtonText="Deploy model" />;

    // Pending extraction (no initialData yet): toggle reports loading
    const { rerender } = render(view);
    expect(mockToggle.props?.isSwitchToFormLoading).toBe(true);

    // Settled — including terminal failure, which the hook reports as loaded: true with
    // errors: the toggle must not stay disabled, or the recovery modal
    // ('Use saved form inputs') can never open
    jest.mocked(useFormYamlResources).mockReturnValue({
      yaml: { yaml: 'kind: LLMInferenceService' },
      setYaml: jest.fn(),
      reinitYamlFromResources: jest.fn(),
      resources: { resources: {} },
      yamlSubmitErrors: [],
      yamlToFormErrors: [new Error('failed to load deployment secrets')],
      initialData: {
        formData: undefined,
        loaded: true,
        errors: [new Error('failed to load deployment secrets')],
      },
    });
    rerender(<ModelDeploymentWizard title="Deploy" primaryButtonText="Deploy model" />);
    expect(mockToggle.props?.isSwitchToFormLoading).toBe(false);
  });
});

describe('ModelDeploymentWizard re-init from YAML', () => {
  const server: Deployment['server'] = {
    apiVersion: 'serving.kserve.io/v1alpha2',
    kind: 'LLMInferenceServiceConfig',
    metadata: { name: 'existing-server', namespace: 'test-ns' },
  };
  const existingModel: ModelResourceType = {
    apiVersion: 'serving.kserve.io/v1alpha2',
    kind: 'LLMInferenceService',
    metadata: { name: 'test-model', namespace: 'test-ns' },
    spec: { replicas: 1 },
  };
  const yamlModel: ModelResourceType = { ...existingModel, spec: { replicas: 2 } };
  const existingDeployment: Deployment = {
    modelServingPlatformId: 'llmd-serving',
    model: existingModel,
    server,
  };
  const navData: InitialWizardFormData = {
    numReplicas: 1,
    navSourceMetadata: { labels: { 'example.com/source': 'catalog' } },
  };
  const formDataFromYaml: InitialWizardFormData = { numReplicas: 2 };

  const mockYamlResources = (
    overrides: Partial<ReturnType<typeof useFormYamlResources>> = {},
  ): void => {
    jest.mocked(useFormYamlResources).mockReturnValue({
      yaml: { yaml: stringify(yamlModel) },
      yamlAtEntry: stringify(existingModel),
      setYaml: jest.fn(),
      reinitYamlFromResources: jest.fn(),
      resources: { resources: { model: yamlModel, server } },
      initialData: { formData: formDataFromYaml, loaded: true, errors: [] },
      yamlSubmitErrors: [],
      yamlToFormErrors: [],
      ...overrides,
    });
  };

  const renderWizard = () =>
    render(
      <ModelDeploymentWizard
        title="Edit"
        primaryButtonText="Update deployment"
        initialFormDataFromNav={navData}
        existingDeployment={existingDeployment}
      />,
    );

  const switchToForm = (updateFormWithYaml = true) =>
    act(() => {
      mockToggle.props?.switchToForm(updateFormWithYaml);
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockToggle.mounts = 0;
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
      loaded: true,
      errors: [],
    });
    jest.mocked(useYamlViewSession).mockReturnValue({
      viewMode: 'yaml-edit',
      isYAMLViewerEnabled: true,
      isAutoFallback: false,
      lastUpdatedSource: 'yaml-edit',
      setLastUpdatedSource: jest.fn(),
      switchToForm: jest.fn(),
      switchToYaml: jest.fn(),
    });
    mockSubmit(false);
    mockYamlResources();
  });

  it('should remount the form with YAML-derived data on top of navigation data after a YAML edit', () => {
    renderWizard();
    expect(mockToggle.mounts).toBe(1);
    expect(jest.mocked(useModelDeploymentWizard)).toHaveBeenLastCalledWith(
      navData,
      undefined,
      {},
      true,
      true,
    );

    switchToForm();

    expect(mockToggle.mounts).toBe(2);
    expect(jest.mocked(useModelDeploymentWizard)).toHaveBeenLastCalledWith(
      { ...navData, ...formDataFromYaml },
      undefined,
      {},
      true,
      true,
    );
    // YAML only owns the model; the existing server stays in the merge base
    expect(jest.mocked(useFormToResourcesTransformer)).toHaveBeenLastCalledWith(expect.anything(), {
      ...existingDeployment,
      model: yamlModel,
    });
    expect(jest.mocked(useYamlViewSession).mock.results[0].value.switchToForm).toHaveBeenCalled();
  });

  it('should keep the mounted form when the YAML only changed comments or formatting', () => {
    mockYamlResources({
      yaml: { yaml: `# reviewed\n${stringify(existingModel, { indent: 4 })}` },
    });
    renderWizard();

    switchToForm();

    expect(mockToggle.mounts).toBe(1);
    expect(jest.mocked(useModelDeploymentWizard)).toHaveBeenLastCalledWith(
      navData,
      undefined,
      {},
      true,
      true,
    );
    expect(jest.mocked(useFormToResourcesTransformer)).toHaveBeenLastCalledWith(
      expect.anything(),
      existingDeployment,
    );
  });

  it('should keep the mounted form when the user chooses saved form inputs', () => {
    renderWizard();

    switchToForm(false);

    expect(mockToggle.mounts).toBe(1);
  });

  it('should keep the mounted form when the YAML cannot be read into form data', () => {
    mockYamlResources({ initialData: { formData: undefined, loaded: true, errors: [] } });
    renderWizard();

    switchToForm();

    expect(mockToggle.mounts).toBe(1);
  });

  it('should remount when the editor was seeded from the deployment instead of the form', () => {
    mockYamlResources({ yaml: { yaml: stringify(existingModel) }, yamlAtEntry: undefined });
    renderWizard();

    switchToForm();

    expect(mockToggle.mounts).toBe(2);
  });

  it.each([true, false])(
    'should seed the YAML editor from the deployment only in auto-fallback (%s)',
    (isAutoFallback) => {
      jest.mocked(useYamlViewSession).mockReturnValue({
        viewMode: 'yaml-edit',
        isYAMLViewerEnabled: true,
        isAutoFallback,
        lastUpdatedSource: 'yaml-edit',
        setLastUpdatedSource: jest.fn(),
        switchToForm: jest.fn(),
        switchToYaml: jest.fn(),
      });
      renderWizard();

      expect(jest.mocked(useFormYamlResources)).toHaveBeenLastCalledWith(
        isAutoFallback ? existingDeployment : undefined,
      );
    },
  );

  it.each(['modelSourceLoaded', 'modelDeploymentLoaded'] as const)(
    'should keep the YAML toggle loading until %s',
    (flag) => {
      jest
        .mocked(useModelDeploymentWizard)
        .mockReturnValue(mockDeploymentWizardState({ loaded: { [flag]: false } }));
      const { rerender } = renderWizard();
      expect(mockToggle.props?.isSwitchToYamlLoading).toBe(true);

      jest.mocked(useModelDeploymentWizard).mockReturnValue(mockDeploymentWizardState());
      rerender(
        <ModelDeploymentWizard
          title="Edit"
          primaryButtonText="Update deployment"
          initialFormDataFromNav={navData}
          existingDeployment={existingDeployment}
        />,
      );
      expect(mockToggle.props?.isSwitchToYamlLoading).toBe(false);
    },
  );

  it('should disable the view toggle while a deploy is in flight', () => {
    jest.mocked(useModelDeploymentSubmit).mockReturnValue({
      onSave: jest.fn(),
      isLoading: true,
      isReady: true,
      isReadinessLoading: false,
      submitError: null,
      clearSubmitError: jest.fn(),
    });
    renderWizard();

    expect(mockToggle.props?.isDisabled).toBe(true);
  });
});
