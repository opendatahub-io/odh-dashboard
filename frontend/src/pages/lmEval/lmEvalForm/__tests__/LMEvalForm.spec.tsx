import * as React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import useInferenceServices from '#~/pages/modelServing/useInferenceServices';
import useServingRuntimes from '#~/pages/modelServing/useServingRuntimes';
import { standardUseFetchStateObject } from '#~/__tests__/unit/testUtils/hooks';
import { mockInferenceServices, nonVllmService } from './__mocks__/mockInferenceServicesData';
import {
  renderWithContext,
  createMockServicesWithUrls,
  defaultLMEvalFormState,
  selectModel,
  selectModelType,
} from './__mocks__/testUtils';

// Mock the dependencies
jest.mock('#~/pages/modelServing/useInferenceServices', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/pages/modelServing/useServingRuntimes', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/pages/lmEval/utilities/useLMGenericObjectState', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock other components to focus on the dropdown functionality
jest.mock('#~/pages/lmEval/components/LMEvalApplicationPage', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="lm-eval-app-page">{children}</div>
  ),
}));

jest.mock('#~/pages/lmEval/lmEvalForm/LMEvalFormFooter', () => ({
  __esModule: true,
  default: () => <div data-testid="lm-eval-form-footer">Footer</div>,
}));

jest.mock('#~/pages/lmEval/lmEvalForm/LMEvalTaskSection', () => ({
  __esModule: true,
  default: () => <div data-testid="lm-eval-task-section">Task Section</div>,
}));

jest.mock('#~/pages/lmEval/lmEvalForm/LMEvalSecuritySection', () => ({
  __esModule: true,
  default: () => <div data-testid="lm-eval-security-section">Security Section</div>,
}));

jest.mock('#~/pages/lmEval/lmEvalForm/LMEvalModelArgumentSection', () => ({
  __esModule: true,
  default: () => <div data-testid="lm-eval-model-argument-section">Model Argument Section</div>,
}));

const mockUseInferenceServices = jest.mocked(useInferenceServices);
const mockUseServingRuntimes = jest.mocked(useServingRuntimes);

// Helper function to setup standard inference services mock
const setupInferenceServicesMock = (services = mockInferenceServices) => {
  mockUseInferenceServices.mockReturnValue(
    standardUseFetchStateObject({
      data: { items: services, hasNonDashboardItems: false },
      loaded: true,
    }),
  );
};

// Helper function to setup standard serving runtimes mock
const setupServingRuntimesMock = () => {
  mockUseServingRuntimes.mockReturnValue(
    standardUseFetchStateObject({
      data: { items: [], hasNonDashboardItems: false },
      loaded: true,
    }),
  );
};

// Helper function to setup useLMGenericObjectState mock
const setupLMGenericObjectStateMock = (overrides = {}) => {
  const mockSetData = jest.fn();
  const state = {
    ...defaultLMEvalFormState,
    ...overrides,
  };

  const mockUseLMGenericObjectState = jest.mocked(
    require('#~/pages/lmEval/utilities/useLMGenericObjectState').default,
  );
  mockUseLMGenericObjectState.mockReturnValue([state, mockSetData]);

  return mockSetData;
};

describe('LMEvalForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock for useLMGenericObjectState
    const mockUseLMGenericObjectState = jest.mocked(
      require('#~/pages/lmEval/utilities/useLMGenericObjectState').default,
    );
    mockUseLMGenericObjectState.mockReturnValue([defaultLMEvalFormState, jest.fn()]);
  });

  it('should use default namespace when no project in context', () => {
    setupInferenceServicesMock();
    setupServingRuntimesMock();
    renderWithContext();

    // Should show model dropdown
    expect(screen.getByText('Model name')).toBeInTheDocument();
    expect(screen.getByText('Select a model')).toBeInTheDocument();
  });

  it('should render the form with model dropdown when project is provided', () => {
    setupInferenceServicesMock();
    setupServingRuntimesMock();
    renderWithContext('default');

    // Should not show namespace dropdown
    expect(screen.queryByText('Namespace')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Namespace options menu')).not.toBeInTheDocument();

    // Should show model dropdown
    expect(screen.getByText('Model name')).toBeInTheDocument();
    expect(screen.getByText('Select a model')).toBeInTheDocument();
  });

  it('should show models from the project namespace', async () => {
    setupInferenceServicesMock();
    setupServingRuntimesMock();
    renderWithContext('default');

    // Open model dropdown
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should show models from 'default' namespace
    await waitFor(() => {
      expect(screen.getByText('Model One')).toBeInTheDocument();
      expect(screen.getByText('Model Two')).toBeInTheDocument();
    });
  });

  it('should handle loading state', async () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: [], hasNonDashboardItems: false },
        loaded: false,
      }),
    );
    setupServingRuntimesMock();

    renderWithContext('default');

    // Model dropdown should be enabled even when loading
    const modelDropdown = screen.getByLabelText('Model options menu');
    expect(modelDropdown).not.toBeDisabled();

    // Should show normal text in toggle
    expect(screen.getByText('Select a model')).toBeInTheDocument();

    // Open dropdown to check loading skeleton in list
    fireEvent.click(modelDropdown);

    // Wait for skeleton elements to render (they're in the dropdown portal)
    await waitFor(() => {
      const loadingSkeletons = document.querySelectorAll('.pf-v6-c-skeleton');
      expect(loadingSkeletons.length).toBe(3); // Should have 3 skeleton elements
    });
  });

  it('should handle error state with no data loaded', () => {
    mockUseInferenceServices.mockReturnValue(
      standardUseFetchStateObject({
        data: { items: [], hasNonDashboardItems: false },
        loaded: true,
        error: new Error('Failed to fetch inference services'),
      }),
    );
    setupServingRuntimesMock();

    renderWithContext('default');

    // Model dropdown should be enabled when there's an error
    const modelDropdown = screen.getByLabelText('Model options menu');
    expect(modelDropdown).not.toBeDisabled();

    // Should show normal text in toggle
    expect(screen.getByText('Select a model')).toBeInTheDocument();

    // Open dropdown - should NOT show skeleton since there's an error (even if loaded=false)
    fireEvent.click(modelDropdown);

    // Should NOT show skeleton options when there's an error (error state takes precedence over loading)
    const skeletonElements = document.querySelectorAll('.pf-v6-c-skeleton');
    expect(skeletonElements.length).toBe(0); // Should have no skeleton elements when there's an error
  });

  it('should show empty state when no models are available', () => {
    setupInferenceServicesMock([]);
    setupServingRuntimesMock();
    renderWithContext('default');

    // Model dropdown should be enabled when data is loaded
    const modelDropdown = screen.getByLabelText('Model options menu');
    expect(modelDropdown).not.toBeDisabled();

    // Open model dropdown
    fireEvent.click(modelDropdown);

    // Should show empty state
    expect(screen.getByText('No vLLM models available')).toBeInTheDocument();
    expect(
      screen.getByText(/No vLLM inference services are available in the 'default' namespace/),
    ).toBeInTheDocument();
  });

  it('should render all form sections', () => {
    setupInferenceServicesMock();
    setupServingRuntimesMock();
    renderWithContext('default');

    expect(screen.getByTestId('lm-eval-task-section')).toBeInTheDocument();
    expect(screen.getByTestId('lm-eval-security-section')).toBeInTheDocument();
    expect(screen.getByTestId('lm-eval-model-argument-section')).toBeInTheDocument();
    expect(screen.getByTestId('lm-eval-form-footer')).toBeInTheDocument();
  });

  it('should only show vLLM models in the dropdown', async () => {
    // Include both vLLM and non-vLLM services
    const mixedServices = [...mockInferenceServices, nonVllmService];
    setupInferenceServicesMock(mixedServices);
    setupServingRuntimesMock();
    renderWithContext('default');

    // Open model dropdown
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should show only vLLM models (Model One and Model Two)
    await waitFor(() => {
      expect(screen.getByText('Model One')).toBeInTheDocument();
      expect(screen.getByText('Model Two')).toBeInTheDocument();
      // Should NOT show the non-vLLM model
      expect(screen.queryByText('Non-LLM Model')).not.toBeInTheDocument();
    });
  });

  it('should filter models by the project namespace', async () => {
    setupInferenceServicesMock();
    setupServingRuntimesMock();
    // Render with 'production' namespace
    renderWithContext('production');

    // Open model dropdown
    const modelDropdown = screen.getByLabelText('Model options menu');
    fireEvent.click(modelDropdown);

    // Should show only models from 'production' namespace
    await waitFor(() => {
      expect(screen.getByText('Model Three')).toBeInTheDocument();
      // Should NOT show models from other namespaces
      expect(screen.queryByText('Model One')).not.toBeInTheDocument();
      expect(screen.queryByText('Model Two')).not.toBeInTheDocument();
    });
  });

  it('should populate model name and URL when a model is selected', async () => {
    const mockSetData = setupLMGenericObjectStateMock();
    const mockServicesWithUrls = createMockServicesWithUrls();
    setupInferenceServicesMock(mockServicesWithUrls as typeof mockInferenceServices);
    setupServingRuntimesMock();
    renderWithContext('default');

    await selectModel('Model One');

    // Verify setData was called to update deployedModelName
    expect(mockSetData).toHaveBeenCalledWith('deployedModelName', 'model-1');

    // Verify setData was called to update model arguments
    expect(mockSetData).toHaveBeenCalledWith('model', {
      name: 'Model One',
      url: 'https://model-1.apps.example.com',
      tokenizedRequest: 'False',
      tokenizer: '',
    });
  });

  it('should populate model name and URL with endpoint when model type is already selected', async () => {
    const mockSetData = setupLMGenericObjectStateMock({
      modelType: 'local-chat-completions',
    });
    const mockServicesWithUrls = createMockServicesWithUrls();
    setupInferenceServicesMock(mockServicesWithUrls as typeof mockInferenceServices);
    setupServingRuntimesMock();
    renderWithContext('default');

    await selectModel('Model One');

    // Verify setData was called to update model arguments with endpoint appended
    expect(mockSetData).toHaveBeenCalledWith('model', {
      name: 'Model One',
      url: 'https://model-1.apps.example.com/v1/chat/completions',
      tokenizedRequest: 'False',
      tokenizer: '',
    });
  });

  it('should clear model arguments when model becomes unavailable after namespace change', () => {
    const mockSetData = setupLMGenericObjectStateMock({
      deployedModelName: 'model-1',
      model: {
        name: 'Model One',
        url: 'https://model-1.apps.example.com',
        tokenizedRequest: 'False',
        tokenizer: '',
      },
    });
    // Mock inference services that don't include model-1 (simulating namespace change)
    setupInferenceServicesMock([]);
    setupServingRuntimesMock();
    renderWithContext('default');

    // The useEffect should trigger and clear the model
    expect(mockSetData).toHaveBeenCalledWith('deployedModelName', '');
    expect(mockSetData).toHaveBeenCalledWith('model', {
      name: '',
      url: '',
      tokenizedRequest: 'False',
      tokenizer: '',
    });
  });

  it('should append endpoint to existing URL when model type is selected', () => {
    const mockSetData = setupLMGenericObjectStateMock({
      deployedModelName: 'model-1',
      model: {
        name: 'Model One',
        url: 'https://model-1.apps.example.com',
        tokenizedRequest: 'False',
        tokenizer: '',
      },
    });
    setupInferenceServicesMock();
    setupServingRuntimesMock();
    renderWithContext('default');

    selectModelType('Local chat completion');

    // Verify setData was called to update model type
    expect(mockSetData).toHaveBeenCalledWith('modelType', 'local-chat-completions');

    // Verify setData was called to update URL with endpoint
    expect(mockSetData).toHaveBeenCalledWith('model', {
      name: 'Model One',
      url: 'https://model-1.apps.example.com/v1/chat/completions',
      tokenizedRequest: 'False',
      tokenizer: '',
    });
  });
});
