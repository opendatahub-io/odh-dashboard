import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmInferenceServiceConfigAddForm, {
  LlmInferenceServiceConfigFormByName,
} from '../LlmInferenceServiceConfigAddForm';
import { LlmInferenceServiceConfigContext } from '../LlmInferenceServiceConfigContext';
import {
  createLLMInferenceServiceConfig,
  updateLLMInferenceServiceConfig,
} from '../../../api/LLMInferenceServiceConfigs';
import type { LLMInferenceServiceConfigKind } from '../../../types';
import { createTestProviders } from '../../../__tests__/hostApiTestUtils';
import { LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH } from '../paths';

const { wrapper } = createTestProviders();

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('../../ConfigYAMLEditor', () =>
  jest.fn(({ code, onCodeChange }) => (
    <textarea
      data-testid="yaml-editor-mock"
      value={code}
      onChange={(e) => onCodeChange(e.target.value)}
    />
  )),
);

jest.mock('../../../api/LLMInferenceServiceConfigs', () => ({
  createLLMInferenceServiceConfig: jest.fn(),
  updateLLMInferenceServiceConfig: jest.fn(),
}));

const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);
const mockCreateLLMInferenceServiceConfig = jest.mocked(createLLMInferenceServiceConfig);
const mockUpdateLLMInferenceServiceConfig = jest.mocked(updateLLMInferenceServiceConfig);

// The component now derives listPath internally from the shared tab path constant.
const LIST_PATH = LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH;

describe('LlmInferenceServiceConfigAddForm', () => {
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(navigateMock);
    mockUseParams.mockReturnValue({});
  });

  describe('Add mode', () => {
    it('should render with "Add" title and empty fields', () => {
      render(<LlmInferenceServiceConfigAddForm mode="add" />, { wrapper });

      expect(screen.getByTestId('app-page-title')).toHaveTextContent(
        'Add LLM inference service configuration',
      );
      expect(screen.getByTestId('app-page-description')).toHaveTextContent(
        'Add a new inference service configuration that will be available for users on this cluster.',
      );
      expect(screen.getByTestId('llm-inference-service-config-name')).toHaveValue('');
    });

    it('should disable Create button when name is empty', () => {
      render(<LlmInferenceServiceConfigAddForm mode="add" />, { wrapper });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable Create button when name and YAML are filled', () => {
      render(<LlmInferenceServiceConfigAddForm mode="add" />, { wrapper });

      const nameInput = screen.getByTestId('llm-inference-service-config-name');
      fireEvent.change(nameInput, { target: { value: 'Test Config' } });

      const yamlEditor = screen.getByTestId('yaml-editor-mock');
      fireEvent.change(yamlEditor, { target: { value: 'apiVersion: v1' } });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call createLLMInferenceServiceConfig on submit', async () => {
      mockCreateLLMInferenceServiceConfig.mockResolvedValue({} as LLMInferenceServiceConfigKind);

      render(<LlmInferenceServiceConfigAddForm mode="add" />, { wrapper });

      fireEvent.change(screen.getByTestId('llm-inference-service-config-name'), {
        target: { value: 'New Config' },
      });
      fireEvent.change(screen.getByTestId('yaml-editor-mock'), {
        target: { value: 'metadata:\n  name: placeholder' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockCreateLLMInferenceServiceConfig).toHaveBeenCalled();
      });

      const callArg = mockCreateLLMInferenceServiceConfig.mock.calls[0][0];
      expect(callArg.metadata.annotations?.['openshift.io/display-name']).toBe('New Config');
      expect(callArg.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
      expect(callArg.metadata.labels?.['opendatahub.io/config-type']).toBe('accelerator');
    });

    it('should navigate back on successful create', async () => {
      mockCreateLLMInferenceServiceConfig.mockResolvedValue({} as LLMInferenceServiceConfigKind);

      render(<LlmInferenceServiceConfigAddForm mode="add" />, { wrapper });

      fireEvent.change(screen.getByTestId('llm-inference-service-config-name'), {
        target: { value: 'New Config' },
      });
      fireEvent.change(screen.getByTestId('yaml-editor-mock'), {
        target: { value: 'metadata:\n  name: placeholder' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith(LIST_PATH);
      });
    });

    it('should navigate back when Cancel is clicked', () => {
      render(<LlmInferenceServiceConfigAddForm mode="add" />, { wrapper });

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(navigateMock).toHaveBeenCalledWith(LIST_PATH);
    });
  });

  describe('Duplicate mode', () => {
    it('should render with "Duplicate" title and pre-filled name', () => {
      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-config',
        displayName: 'Source Config',
      });

      render(<LlmInferenceServiceConfigAddForm mode="duplicate" sourceConfig={sourceConfig} />, {
        wrapper,
      });

      expect(screen.getByTestId('app-page-title')).toHaveTextContent(
        'Duplicate LLM inference service configuration',
      );
      expect(screen.getByTestId('app-page-description')).toHaveTextContent(
        'Add a new, editable configuration by duplicating an existing one.',
      );

      const nameInput = screen.getByTestId('llm-inference-service-config-name') as HTMLInputElement;
      expect(nameInput.value).toBe('Copy of Source Config');
    });

    it('should call createLLMInferenceServiceConfig with dashboard label', async () => {
      mockCreateLLMInferenceServiceConfig.mockResolvedValue({} as LLMInferenceServiceConfigKind);

      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-config',
      });

      render(<LlmInferenceServiceConfigAddForm mode="duplicate" sourceConfig={sourceConfig} />, {
        wrapper,
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockCreateLLMInferenceServiceConfig).toHaveBeenCalled();
      });

      const callArg = mockCreateLLMInferenceServiceConfig.mock.calls[0][0];
      expect(callArg.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
    });

    it('should auto-update resource name when display name changes', () => {
      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-config',
        displayName: 'Source Config',
      });

      render(<LlmInferenceServiceConfigAddForm mode="duplicate" sourceConfig={sourceConfig} />, {
        wrapper,
      });

      const nameInput = screen.getByTestId('llm-inference-service-config-name');
      fireEvent.change(nameInput, { target: { value: 'My Custom Name' } });

      expect(screen.getByText('my-custom-name', { exact: false })).toBeInTheDocument();
    });
  });

  describe('Edit mode', () => {
    it('should render with "Edit [name]" title and pre-filled name', () => {
      const existingConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'existing-config',
        displayName: 'Existing Config',
      });

      render(<LlmInferenceServiceConfigAddForm mode="edit" sourceConfig={existingConfig} />, {
        wrapper,
      });

      expect(screen.getByTestId('app-page-title')).toHaveTextContent('Edit Existing Config');
      expect(screen.getByTestId('app-page-description')).toHaveTextContent(
        'Modify properties for your inference service configuration.',
      );

      const nameInput = screen.getByTestId('llm-inference-service-config-name') as HTMLInputElement;
      expect(nameInput.value).toBe('Existing Config');
    });

    it('should enable Update button when form is valid', () => {
      const existingConfig = mockLLMInferenceServiceConfigK8sResource({});

      render(<LlmInferenceServiceConfigAddForm mode="edit" sourceConfig={existingConfig} />, {
        wrapper,
      });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call updateLLMInferenceServiceConfig on submit', async () => {
      mockUpdateLLMInferenceServiceConfig.mockResolvedValue({} as LLMInferenceServiceConfigKind);

      const existingConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'existing-config',
      });

      render(<LlmInferenceServiceConfigAddForm mode="edit" sourceConfig={existingConfig} />, {
        wrapper,
      });

      fireEvent.change(screen.getByTestId('llm-inference-service-config-name'), {
        target: { value: 'Updated Config' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockUpdateLLMInferenceServiceConfig).toHaveBeenCalled();
      });

      const callArg = mockUpdateLLMInferenceServiceConfig.mock.calls[0][0];
      expect(callArg.metadata.annotations?.['openshift.io/display-name']).toBe('Updated Config');
    });
  });
});

describe('LlmInferenceServiceConfigFormByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(jest.fn());
  });

  it('should render AddForm with sourceConfig from context', () => {
    const existingConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'config-from-context',
    });

    mockUseParams.mockReturnValue({ configName: 'config-from-context' });

    render(
      <LlmInferenceServiceConfigContext.Provider
        value={{
          configs: [existingConfig],
        }}
      >
        <LlmInferenceServiceConfigFormByName mode="edit" />
      </LlmInferenceServiceConfigContext.Provider>,
      { wrapper },
    );

    expect(screen.getByTestId('app-page-title')).toBeInTheDocument();
  });

  it('should show a not-found message rather than redirect when editing a config that is not found', () => {
    mockUseParams.mockReturnValue({ configName: 'nonexistent-config' });

    render(
      <LlmInferenceServiceConfigContext.Provider
        value={{
          configs: [],
        }}
      >
        <LlmInferenceServiceConfigFormByName mode="edit" />
      </LlmInferenceServiceConfigContext.Provider>,
      { wrapper },
    );

    expect(screen.getByText('Unable to edit inference service configuration')).toBeInTheDocument();
    expect(screen.getByText('nonexistent-config', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to the list' })).toHaveAttribute(
      'href',
      LIST_PATH,
    );
    // It must NOT silently redirect to the list.
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('should label the not-found message as a duplicate failure when duplicating a config that is not found', () => {
    mockUseParams.mockReturnValue({ configName: 'nonexistent-config' });

    render(
      <LlmInferenceServiceConfigContext.Provider
        value={{
          configs: [],
        }}
      >
        <LlmInferenceServiceConfigFormByName mode="duplicate" />
      </LlmInferenceServiceConfigContext.Provider>,
      { wrapper },
    );

    // Copy reflects the duplicate operation, not "edit".
    expect(
      screen.getByText('Unable to duplicate inference service configuration'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Unable to edit inference service configuration'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to the list' })).toHaveAttribute(
      'href',
      LIST_PATH,
    );
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });
});
