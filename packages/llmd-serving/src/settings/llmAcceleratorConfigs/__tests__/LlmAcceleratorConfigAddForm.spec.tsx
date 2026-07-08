import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmAcceleratorConfigAddForm, {
  LlmAcceleratorConfigEditForm,
} from '../LlmAcceleratorConfigAddForm';
import { LlmAcceleratorConfigContext } from '../LlmAcceleratorConfigContext';
import {
  createLLMInferenceServiceConfig,
  updateLLMInferenceServiceConfig,
} from '../../../api/LLMInferenceServiceConfigs';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () =>
  jest.fn(({ children }) => <div data-testid="applications-page">{children}</div>),
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

      expect(screen.getByText('Add LLM accelerator configuration')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Add a new accelerator configuration that will be available for users on this cluster.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByTestId('llm-accelerator-config-name')).toHaveValue('');
    });

    it('should disable Create button when name is empty', () => {
      render(<LlmAcceleratorConfigAddForm mode="add" />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable Create button when name is filled', () => {
      render(<LlmAcceleratorConfigAddForm mode="add" />);

      const nameInput = screen.getByTestId('llm-accelerator-config-name');
      fireEvent.change(nameInput, { target: { value: 'Test Config' } });

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call createLLMInferenceServiceConfig on submit', async () => {
      mockCreateLLMInferenceServiceConfig.mockResolvedValue({} as any);

      render(<LlmAcceleratorConfigAddForm mode="add" />);

      const nameInput = screen.getByTestId('llm-accelerator-config-name');
      fireEvent.change(nameInput, { target: { value: 'New Config' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await screen.findByTestId('submit-button');

      expect(mockCreateLLMInferenceServiceConfig).toHaveBeenCalled();
      const callArg = mockCreateLLMInferenceServiceConfig.mock.calls[0][0];
      expect(callArg.metadata.annotations?.['openshift.io/display-name']).toBe('New Config');
      expect(callArg.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
    });

    it('should navigate back on successful create', async () => {
      mockCreateLLMInferenceServiceConfig.mockResolvedValue({} as any);

      render(<LlmAcceleratorConfigAddForm mode="add" />);

      const nameInput = screen.getByTestId('llm-accelerator-config-name');
      fireEvent.change(nameInput, { target: { value: 'New Config' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await screen.findByTestId('submit-button');

      expect(navigateMock).toHaveBeenCalledWith('..');
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

      expect(screen.getByText('Duplicate LLM accelerator configuration')).toBeInTheDocument();
      expect(
        screen.getByText('Add a new, editable configuration by duplicating an existing one.'),
      ).toBeInTheDocument();

      const nameInput = screen.getByTestId('llm-accelerator-config-name') as HTMLInputElement;
      expect(nameInput.value).toBe('Copy of Source Config');
    });

    it('should call createLLMInferenceServiceConfig with dashboard label', async () => {
      mockCreateLLMInferenceServiceConfig.mockResolvedValue({} as any);

      const sourceConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'source-config',
      });

      render(<LlmAcceleratorConfigAddForm mode="duplicate" sourceConfig={sourceConfig} />);

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await screen.findByTestId('submit-button');

      expect(mockCreateLLMInferenceServiceConfig).toHaveBeenCalled();
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

      expect(screen.getByText('Edit Existing Config')).toBeInTheDocument();
      expect(
        screen.getByText('Modify properties for your accelerator configuration.'),
      ).toBeInTheDocument();

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
      mockUpdateLLMInferenceServiceConfig.mockResolvedValue({} as any);

      const existingConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'existing-config',
      });

      render(<LlmAcceleratorConfigAddForm mode="edit" sourceConfig={existingConfig} />);

      const nameInput = screen.getByTestId('llm-accelerator-config-name');
      fireEvent.change(nameInput, { target: { value: 'Updated Config' } });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await screen.findByTestId('submit-button');

      expect(mockUpdateLLMInferenceServiceConfig).toHaveBeenCalled();
      const callArg = mockUpdateLLMInferenceServiceConfig.mock.calls[0][0];
      expect(callArg.metadata.annotations?.['openshift.io/display-name']).toBe('Updated Config');
    });
  });
});

describe('LlmAcceleratorConfigEditForm', () => {
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
        <LlmAcceleratorConfigEditForm />
      </LlmAcceleratorConfigContext.Provider>,
    );

    expect(screen.getByTestId('applications-page')).toBeInTheDocument();
  });

  it('should render null when config is not found', () => {
    mockUseParams.mockReturnValue({ configName: 'nonexistent-config' });

    const { container } = render(
      <LlmAcceleratorConfigContext.Provider
        value={{
          configs: [],
        }}
      >
        <LlmAcceleratorConfigEditForm />
      </LlmAcceleratorConfigContext.Provider>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
