/* eslint-disable camelcase -- BFF API uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  UseMutationOptions,
} from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AutomlResultsContext } from '~/app/context/AutomlResultsContext';
import type { AutomlResultsContextProps } from '~/app/context/AutomlResultsContext';
import * as modelRegistryApi from '~/app/api/modelRegistry';
import * as useModelRegistriesQueryModule from '~/app/hooks/useModelRegistriesQuery';
import type { ModelRegistriesResponse } from '~/app/types';
import RegisterModelModal, {
  REGISTRATION_FAILURE_MESSAGE,
  REGISTRIES_LOAD_FAILURE_MESSAGE,
} from '~/app/components/run-results/RegisterModelModal';
import { useNotification } from '~/app/hooks/useNotification';
import {
  AUTOML_FAILURE_CATEGORY,
  fireAutomlModelRegistered,
  TrackingOutcome,
} from '~/app/utilities/tracking';

jest.mock('~/app/api/modelRegistry');
jest.mock('~/app/hooks/useModelRegistriesQuery');

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(),
}));

jest.mock('~/app/utilities/tracking', () => ({
  ...jest.requireActual('~/app/utilities/tracking'),
  fireAutomlModelRegistered: jest.fn(),
}));

// `useMutation` is spied on (delegating to the real implementation) purely to capture the
// `onError` callback the component registers, so it can be invoked directly below — the full
// submit-via-UI flow requires a PF6 Select interaction that doesn't work in JSDOM (see the
// 'submission' describe block).
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useMutation: jest.fn(),
}));

const mockRegisterModel = jest.mocked(modelRegistryApi.registerModel);
const mockUseModelRegistriesQuery = jest.mocked(
  useModelRegistriesQueryModule.useModelRegistriesQuery,
);
const fireAutomlModelRegisteredMock = jest.mocked(fireAutomlModelRegistered);
const useNotificationMock = jest.mocked(useNotification);
const notificationError = jest.fn();
const notificationSuccess = jest.fn();
const useMutationMock = jest.mocked(useMutation);
const actualUseMutation =
  jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query').useMutation;

// Helper to create partial UseQueryResult mocks without full type ceremony
const mockQueryResult = (
  overrides: Partial<ReturnType<typeof useModelRegistriesQueryModule.useModelRegistriesQuery>>,
) =>
  overrides as unknown as ReturnType<typeof useModelRegistriesQueryModule.useModelRegistriesQuery>;

const mockRegistries: ModelRegistriesResponse = {
  model_registries: [
    {
      id: 'uid-1',
      name: 'default-registry',
      display_name: 'Default Registry',
      description: 'The default registry',
      is_ready: true,
      server_url: 'https://default-registry.svc:8443/api/model_registry/v1alpha3',
      external_url: 'https://default-registry-rest.apps.example.com/api/model_registry/v1alpha3',
    },
    {
      id: 'uid-2',
      name: 'unavailable-registry',
      display_name: 'Unavailable Registry',
      is_ready: false,
      server_url: 'https://unavailable.svc:8443/api/model_registry/v1alpha3',
    },
  ],
};

const defaultContext: AutomlResultsContextProps = {
  models: {
    TestModel: {
      name: 'TestModel',
      location: {
        model_directory:
          'autogluon-tabular-training-pipeline/run-1/autogluon-models-full-refit/task-1/model_artifact/TestModel/',
        predictor:
          'autogluon-tabular-training-pipeline/run-1/autogluon-models-full-refit/task-1/model_artifact/TestModel/predictor',
        notebook:
          'autogluon-tabular-training-pipeline/run-1/autogluon-models-full-refit/task-1/model_artifact/TestModel/notebook.ipynb',
      },
      metrics: { test_data: { accuracy: 0.95 } },
    },
  },
  modelsLoading: false,
  pipelineRun: {
    run_id: 'run-1',
    display_name: 'My Pipeline Run',
    created_at: '2026-01-01',
    state: 'SUCCEEDED',
  },
  pipelineRunLoading: false,
};

const renderModal = (
  props: { onClose?: () => void; modelName?: string } = {},
  contextOverrides: Partial<AutomlResultsContextProps> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const context = { ...defaultContext, ...contextOverrides };

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/automl/test-ns/results/run-1']}>
        <Routes>
          <Route
            path="/automl/:namespace/results/:runId"
            element={
              <AutomlResultsContext.Provider value={context}>
                <RegisterModelModal
                  onClose={props.onClose ?? jest.fn()}
                  modelName={props.modelName ?? 'TestModel'}
                  source="leaderboard"
                />
              </AutomlResultsContext.Provider>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedMutationOptions: UseMutationOptions<any, unknown, any> | undefined;

describe('RegisterModelModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMutationOptions = undefined;
    useMutationMock.mockImplementation((options) => {
      capturedMutationOptions = options;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return actualUseMutation(options as any);
    });
    useNotificationMock.mockReturnValue({
      success: notificationSuccess,
      error: notificationError,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe('loading state', () => {
    it('should show spinner while registries are loading', () => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: undefined,
          isLoading: true,
          isError: false,
        }),
      );

      renderModal();

      expect(screen.getByTestId('registries-loading')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show the fixed, user-safe message when error is not an Error instance', () => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: undefined,
          isLoading: false,
          isError: true,
          error: undefined,
        }),
      );

      renderModal();

      expect(screen.getByText(REGISTRIES_LOAD_FAILURE_MESSAGE)).toBeInTheDocument();
    });

    it('should show only the fixed, user-safe message, never the raw registry error (CWE-209)', () => {
      const sensitiveMessage =
        'insufficient permissions: tenant=acme-corp registry-endpoint=internal-registry.svc:8443';
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: undefined,
          isLoading: false,
          isError: true,
          error: new Error(sensitiveMessage),
        }),
      );

      renderModal();

      expect(screen.getByTestId('registries-error')).toHaveTextContent(
        REGISTRIES_LOAD_FAILURE_MESSAGE,
      );
      expect(screen.queryByText(sensitiveMessage)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show warning when no registries are available', () => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: { model_registries: [] },
          isLoading: false,
          isError: false,
        }),
      );

      renderModal();

      expect(screen.getByText('No model registries are available')).toBeInTheDocument();
    });

    it('should show warning when no registries are ready', () => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: {
            model_registries: [
              { ...mockRegistries.model_registries[1] }, // is_ready: false
            ],
          },
          isLoading: false,
          isError: false,
        }),
      );

      renderModal();

      expect(screen.getByText('No model registries are available')).toBeInTheDocument();
    });

    it('should show validation error when registry without external URL is selected', () => {
      const registryWithoutExternalUrl = {
        id: 'uid-3',
        name: 'no-external-url',
        display_name: 'No External URL Registry',
        is_ready: true,
        server_url: 'https://internal-only.svc:8443/api/model_registry/v1alpha3',
        // external_url is missing
      };

      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: {
            model_registries: [registryWithoutExternalUrl],
          },
          isLoading: false,
          isError: false,
        }),
      );

      renderModal();

      // Open the dropdown
      fireEvent.click(screen.getByTestId('registry-select-toggle'));

      // Registry without external URL should appear in the dropdown
      const option = screen.getByTestId('registry-option-no-external-url');
      expect(option).toBeInTheDocument();

      // Click on the option to select it
      const optionButton = option.querySelector('button');
      expect(optionButton).not.toBeNull();
      fireEvent.click(optionButton!);

      // Error message should appear
      expect(screen.getByTestId('registry-validation-error')).toBeInTheDocument();
      expect(screen.getByTestId('registry-validation-error')).toHaveTextContent(
        'This registry does not have an external URL configured and cannot be used for model registration.',
      );

      // Submit button should remain disabled
      expect(screen.getByTestId('register-model-submit')).toBeDisabled();
    });

    it('should show validation error when registry with empty external URL is selected', () => {
      const registryWithEmptyExternalUrl = {
        id: 'uid-4',
        name: 'empty-external-url',
        display_name: 'Empty External URL Registry',
        is_ready: true,
        server_url: 'https://internal-only.svc:8443/api/model_registry/v1alpha3',
        external_url: '', // Empty string
      };

      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: {
            model_registries: [registryWithEmptyExternalUrl],
          },
          isLoading: false,
          isError: false,
        }),
      );

      renderModal();

      // Open the dropdown
      fireEvent.click(screen.getByTestId('registry-select-toggle'));

      // Registry with empty external URL should appear in the dropdown
      const option = screen.getByTestId('registry-option-empty-external-url');
      expect(option).toBeInTheDocument();

      // Click on the option to select it
      const optionButton = option.querySelector('button');
      expect(optionButton).not.toBeNull();
      fireEvent.click(optionButton!);

      // Error message should appear
      expect(screen.getByTestId('registry-validation-error')).toBeInTheDocument();
      expect(screen.getByTestId('registry-validation-error')).toHaveTextContent(
        'This registry does not have an external URL configured and cannot be used for model registration.',
      );

      // Submit button should remain disabled
      expect(screen.getByTestId('register-model-submit')).toBeDisabled();
    });
  });

  describe('form rendering', () => {
    beforeEach(() => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: mockRegistries,
          isLoading: false,
          isError: false,
        }),
      );
    });

    it('should pre-fill model name from props', () => {
      renderModal({ modelName: 'TestModel' });

      const input = screen.getByTestId('model-name-input');
      expect(input).toHaveValue('TestModel');
    });

    it('should pre-fill description from pipeline run name', () => {
      renderModal();

      const textarea = screen.getByTestId('model-description-input');
      expect(textarea).toHaveValue('Trained by AutoML pipeline run: My Pipeline Run');
    });

    it('should display the predictor S3 path as read-only', () => {
      renderModal();

      const pathInput = screen.getByTestId('s3-path-display');
      expect(pathInput).toHaveValue(
        'autogluon-tabular-training-pipeline/run-1/autogluon-models-full-refit/task-1/model_artifact/TestModel/predictor',
      );
      expect(pathInput).toBeDisabled();
    });

    it('should only show ready registries in the selector', () => {
      renderModal();

      fireEvent.click(screen.getByTestId('registry-select-toggle'));
      expect(screen.getByTestId('registry-option-default-registry')).toBeInTheDocument();
      expect(screen.queryByTestId('registry-option-unavailable-registry')).not.toBeInTheDocument();
    });

    it('should disable submit button when no registry is selected', () => {
      renderModal();

      expect(screen.getByTestId('register-model-submit')).toBeDisabled();
    });

    it('should show registry selector with placeholder text', () => {
      renderModal();

      expect(screen.getByTestId('registry-select-toggle')).toHaveTextContent(
        'Select a model registry',
      );
    });

    // Note: PF6 Select uses Floating UI portals that don't render in JSDOM,
    // so we cannot test "select registry → submit enabled" in unit tests.
    // Full Select interaction is covered by Cypress mock tests.
    it('should keep submit disabled until a registry is selected', () => {
      renderModal();

      // Model name and predictor path are pre-filled, but no registry selected
      expect(screen.getByTestId('model-name-input')).toHaveValue('TestModel');
      expect(screen.getByTestId('register-model-submit')).toBeDisabled();
    });
  });

  describe('form validation', () => {
    beforeEach(() => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: mockRegistries,
          isLoading: false,
          isError: false,
        }),
      );
    });

    // Note: PF6 Select uses Floating UI portals that don't render in JSDOM,
    // so we cannot select a registry and then clear the model name to test
    // re-disabling. The disabled-without-registry case is covered above.
    // Full validation flow is covered by Cypress mock tests.
    it('should disable submit when model name is empty', () => {
      renderModal({ modelName: '' });

      expect(screen.getByTestId('model-name-input')).toHaveValue('');
      expect(screen.getByTestId('register-model-submit')).toBeDisabled();
    });
  });

  describe('submission', () => {
    beforeEach(() => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: mockRegistries,
          isLoading: false,
          isError: false,
        }),
      );
    });

    // Note: Full submission flow (select registry → submit → verify API call) requires
    // PF6 Select interaction which doesn't work in JSDOM. Covered by Cypress mock tests.
    it('should not submit when no registry is selected', () => {
      renderModal();

      // Submit is disabled without registry
      expect(screen.getByTestId('register-model-submit')).toBeDisabled();
      expect(mockRegisterModel).not.toHaveBeenCalled();
    });

    it('should fire the allowlisted failure category, not the raw error message, on registration failure', () => {
      renderModal();

      // `useMutation` is spied on above purely to capture the component's `onError` callback,
      // sidestepping the PF6 Select interaction limitation noted above.
      expect(capturedMutationOptions?.onError).toBeDefined();
      capturedMutationOptions?.onError?.(
        new Error('registry rejected request: tenant=acme-corp key=AKIAabc123'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
      );

      // Analytics must only ever see the fixed, allowlisted failure category — never the raw
      // Error.message, which may originate from the backend/proxy and embed sensitive details.
      expect(fireAutomlModelRegisteredMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: AUTOML_FAILURE_CATEGORY }),
      );
      const allTrackingCalls = JSON.stringify(fireAutomlModelRegisteredMock.mock.calls);
      expect(allTrackingCalls).not.toContain('acme-corp');
      expect(allTrackingCalls).not.toContain('AKIAabc123');
    });

    it('should show only the fixed, user-safe message in the notification, never the raw registry error (CWE-209)', () => {
      renderModal();

      expect(capturedMutationOptions?.onError).toBeDefined();
      capturedMutationOptions?.onError?.(
        new Error('registry rejected request: tenant=acme-corp key=AKIAabc123'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
      );

      expect(notificationError).toHaveBeenCalledWith(
        'Failed to register model',
        REGISTRATION_FAILURE_MESSAGE,
      );
      const allNotificationCalls = JSON.stringify(notificationError.mock.calls);
      expect(allNotificationCalls).not.toContain('acme-corp');
      expect(allNotificationCalls).not.toContain('AKIAabc123');
    });

    it('should render only the fixed, user-safe message in the error alert, never the raw registry error (CWE-209)', () => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: mockRegistries,
          isLoading: false,
          isError: false,
        }),
      );
      const sensitiveMessage = 'registry rejected request: tenant=acme-corp key=AKIAabc123';
      // Override the delegated `useMutation` result for this render only, to simulate the
      // post-failure state (isError/error) without needing the PF6 Select interaction that
      // JSDOM can't drive.
      useMutationMock.mockImplementationOnce(
        (options) =>
          ({
            ...actualUseMutation(options),
            isError: true,
            error: new Error(sensitiveMessage),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any,
      );

      renderModal();

      const alert = screen.getByTestId('register-model-error');
      expect(alert).toHaveTextContent(REGISTRATION_FAILURE_MESSAGE);
      expect(alert).not.toHaveTextContent(sensitiveMessage);
      expect(screen.queryByText(sensitiveMessage)).not.toBeInTheDocument();
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      mockUseModelRegistriesQuery.mockReturnValue(
        mockQueryResult({
          data: mockRegistries,
          isLoading: false,
          isError: false,
        }),
      );
    });

    it('should call onClose when cancel is clicked', () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      fireEvent.click(screen.getByTestId('register-model-cancel'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose and fire a cancel event when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderModal({ onClose });

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(fireAutomlModelRegisteredMock).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: TrackingOutcome.cancel }),
      );
    });

    it('should call onClose and fire a cancel event when the close control is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderModal({ onClose });

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(fireAutomlModelRegisteredMock).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: TrackingOutcome.cancel }),
      );
    });

    it('should not close or fire a cancel event via Escape while a registration request is pending', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      // Override the delegated `useMutation` result for this render only, to simulate the
      // in-flight (isPending) state without needing the PF6 Select interaction that JSDOM
      // can't drive.
      useMutationMock.mockImplementationOnce(
        (options) =>
          ({
            ...actualUseMutation(options),
            isPending: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any,
      );
      renderModal({ onClose });

      await user.keyboard('{Escape}');

      // PatternFly's Modal invokes onClose for Escape regardless of the disabled Cancel
      // button — closing here would let a stray "cancel" event race with the submit
      // success/failure event that the mutation fires once the in-flight request resolves.
      expect(onClose).not.toHaveBeenCalled();
      expect(fireAutomlModelRegisteredMock).not.toHaveBeenCalled();
    });

    it('should not close or fire a cancel event via the close control while a registration request is pending', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      useMutationMock.mockImplementationOnce(
        (options) =>
          ({
            ...actualUseMutation(options),
            isPending: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any,
      );
      renderModal({ onClose });

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(onClose).not.toHaveBeenCalled();
      expect(fireAutomlModelRegisteredMock).not.toHaveBeenCalled();
    });
  });
});
