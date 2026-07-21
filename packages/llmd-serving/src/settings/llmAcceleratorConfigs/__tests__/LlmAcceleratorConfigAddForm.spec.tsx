import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmAcceleratorConfigAddForm, {
  LlmAcceleratorConfigFormByName,
} from '../LlmAcceleratorConfigAddForm';
import { LlmAcceleratorConfigContext } from '../LlmAcceleratorConfigContext';
import {
  createLLMInferenceServiceConfig,
  updateLLMInferenceServiceConfig,
} from '../../../api/LLMInferenceServiceConfigs';
import type { LLMInferenceServiceConfigKind } from '../../../types';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
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

describe('LlmAcceleratorConfigAddForm', () => {
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(navigateMock);
    mockUseParams.mockReturnValue({});
  });

  describe('Add mode', () => {
    it('should render with "Add" title and empty fields', () => {
      render(<LlmAcceleratorConfigAddForm mode="add" />);

      expect(screen.getByTestId('app-page-title')).toHaveTextContent(
        'Add LLM accelerator configuration',
      );
      expect(screen.getByTestId('app-page-description')).toHaveTextContent(
        'Add a new accelerator configuration that will be available for users on this cluster.',
      );
      expect(screen.getByTestId('llm-accelerator-config-name')).toHaveValue('');
    });

    it('should disable Create button when name is empty', () => {
      render(<LlmAcceleratorConfigAddForm mode="add" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable Create button when name and YAML are filled', () => {
      render(<LlmAcceleratorConfigAddForm mode="add" />);

      const nameInput = screen.getByTestId('llm-accelerator-config-name');
      fireEvent.change(nameInput, { target: { value: 'Test Config' } });

      const yamlEditor = screen.getByTestId('yaml-editor-mock');
      fireEvent.change(yamlEditor, { target: { value: 'apiVersion: v1' } });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call createLLMInferenceServiceConfig on submit', async () => {
      mockCreateLLMInferenceServiceConfig.mockResolvedValue({} as LLMInferenceServiceConfigKind);

      render(<LlmAcceleratorConfigAddForm mode="add" />);

      fireEvent.change(screen.getByTestId('llm-accelerator-config-name'), {
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

      render(<LlmAcceleratorConfigAddForm mode="add" />);

      fireEvent.change(screen.getByTestId('llm-accelerator-config-name'), {
        target: { value: 'New Config' },
      });
      fireEvent.change(screen.getByTestId('yaml-editor-mock'), {
        target: { value: 'metadata:\n  name: placeholder' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith('..');
      });
    });

    it('should navigate back when Cancel is clicked', () => {
      render(<LlmAcceleratorConfigAddForm mode="add" />);

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(navigateMock).toHaveBeenCalledWith('..');
    });
  });

  describe('Duplicate mode', () => {
    it('should render with "Duplicate" title and pre-filled name', () => {
      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-config',
        displayName: 'Source Config',
      });

      render(<LlmAcceleratorConfigAddForm mode="duplicate" sourceConfig={sourceConfig} />);

      expect(screen.getByTestId('app-page-title')).toHaveTextContent(
        'Duplicate LLM accelerator configuration',
      );
      expect(screen.getByTestId('app-page-description')).toHaveTextContent(
        'Add a new, editable configuration by duplicating an existing one.',
      );

      const nameInput = screen.getByTestId('llm-accelerator-config-name') as HTMLInputElement;
      expect(nameInput.value).toBe('Copy of Source Config');
    });

    it('should call createLLMInferenceServiceConfig with dashboard label', async () => {
      mockCreateLLMInferenceServiceConfig.mockResolvedValue({} as LLMInferenceServiceConfigKind);

      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-config',
      });

      render(<LlmAcceleratorConfigAddForm mode="duplicate" sourceConfig={sourceConfig} />);

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockCreateLLMInferenceServiceConfig).toHaveBeenCalled();
      });

      const callArg = mockCreateLLMInferenceServiceConfig.mock.calls[0][0];
      expect(callArg.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
    });
  });

  describe('Edit mode', () => {
    it('should render with "Edit [name]" title and pre-filled name', () => {
      const existingConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'existing-config',
        displayName: 'Existing Config',
      });

      render(<LlmAcceleratorConfigAddForm mode="edit" sourceConfig={existingConfig} />);

      expect(screen.getByTestId('app-page-title')).toHaveTextContent('Edit Existing Config');
      expect(screen.getByTestId('app-page-description')).toHaveTextContent(
        'Modify properties for your accelerator configuration.',
      );

      const nameInput = screen.getByTestId('llm-accelerator-config-name') as HTMLInputElement;
      expect(nameInput.value).toBe('Existing Config');
    });

    it('should enable Update button when form is valid', () => {
      const existingConfig = mockLLMInferenceServiceConfigK8sResource({});

      render(<LlmAcceleratorConfigAddForm mode="edit" sourceConfig={existingConfig} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call updateLLMInferenceServiceConfig on submit', async () => {
      mockUpdateLLMInferenceServiceConfig.mockResolvedValue({} as LLMInferenceServiceConfigKind);

      const existingConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'existing-config',
      });

      render(<LlmAcceleratorConfigAddForm mode="edit" sourceConfig={existingConfig} />);

      fireEvent.change(screen.getByTestId('llm-accelerator-config-name'), {
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

describe('LlmAcceleratorConfigFormByName', () => {
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
      <LlmAcceleratorConfigContext.Provider
        value={{
          configs: [existingConfig],
        }}
      >
        <LlmAcceleratorConfigFormByName mode="edit" />
      </LlmAcceleratorConfigContext.Provider>,
    );

    expect(screen.getByTestId('app-page-title')).toBeInTheDocument();
  });

  it('should redirect when config is not found', () => {
    mockUseParams.mockReturnValue({ configName: 'nonexistent-config' });

    render(
      <LlmAcceleratorConfigContext.Provider
        value={{
          configs: [],
        }}
      >
        <LlmAcceleratorConfigFormByName mode="edit" />
      </LlmAcceleratorConfigContext.Provider>,
    );

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '..');
  });
});
