import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { fireDeployMethodSelected } from '../../../../shared/tracking/modelServingTrackingConstants';
import {
  DeploymentMethodSelectFieldWizardField,
  resolveDeploymentMethodSuggestion,
  type DeploymentMethodExternalData,
  type DeploymentMethodFieldData,
} from '../DeploymentMethodSelectField';
import type { DeploymentMethodFieldOverride } from '../../../../shared/types/form-data';

jest.mock('../../../../shared/tracking/modelServingTrackingConstants', () => ({
  fireDeployMethodSelected: jest.fn(),
}));

const mockFireDeployMethodSelected = jest.mocked(fireDeployMethodSelected);

const DeploymentMethodSelectFieldComponent = DeploymentMethodSelectFieldWizardField.component;

const vllmOption = { key: 'vllm', label: 'LLM inference service', description: '', order: 1 };
const llmdOption = { key: 'llmd', label: 'llm-d', description: '', order: 2 };
const legacyOption = { key: 'legacy', label: 'Legacy', description: '', order: 3 };

const makeOverride = (
  option: { key: string; label: string; description: string; order: number },
  suggestion?: DeploymentMethodFieldOverride['suggestion'],
): DeploymentMethodFieldOverride => ({
  id: 'deploymentMethod',
  type: 'modifier',
  isActive: () => true,
  options: [option],
  suggestion,
});

describe('resolveDeploymentMethodSuggestion', () => {
  it('should pick the suggestion with the lowest order when multiple suggest', () => {
    const overrides = [
      makeOverride(legacyOption, () => legacyOption),
      makeOverride(vllmOption, () => vllmOption),
    ];
    expect(resolveDeploymentMethodSuggestion(overrides, null)?.key).toBe('vllm');
  });

  it('should return the only suggestion when just one override suggests', () => {
    const overrides = [
      makeOverride(vllmOption, () => undefined),
      makeOverride(legacyOption, () => legacyOption),
    ];
    expect(resolveDeploymentMethodSuggestion(overrides, null)?.key).toBe('legacy');
  });

  it('should return undefined when no overrides suggest', () => {
    const overrides = [
      makeOverride(vllmOption, () => undefined),
      makeOverride(legacyOption, () => undefined),
    ];
    expect(resolveDeploymentMethodSuggestion(overrides, null)).toBeUndefined();
  });

  it('should return undefined for empty overrides', () => {
    expect(resolveDeploymentMethodSuggestion([], null)).toBeUndefined();
  });

  it('3 options, isLLMdDefault OFF: vLLM wins over legacy', () => {
    const overrides = [
      makeOverride(vllmOption, (cs) => (!cs?.isLLMdDefault ? vllmOption : undefined)),
      makeOverride(llmdOption, (cs) => (cs?.isLLMdDefault ? llmdOption : undefined)),
      makeOverride(legacyOption, (cs) => (!cs?.isLLMdDefault ? legacyOption : undefined)),
    ];
    expect(resolveDeploymentMethodSuggestion(overrides, { isLLMdDefault: false })?.key).toBe(
      'vllm',
    );
  });

  it('3 options, isLLMdDefault ON: llm-d wins', () => {
    const overrides = [
      makeOverride(vllmOption, (cs) => (!cs?.isLLMdDefault ? vllmOption : undefined)),
      makeOverride(llmdOption, (cs) => (cs?.isLLMdDefault ? llmdOption : undefined)),
      makeOverride(legacyOption, (cs) => (!cs?.isLLMdDefault ? legacyOption : undefined)),
    ];
    expect(resolveDeploymentMethodSuggestion(overrides, { isLLMdDefault: true })?.key).toBe('llmd');
  });

  it('2 options (no vLLM), isLLMdDefault OFF: legacy wins', () => {
    const overrides = [
      makeOverride(llmdOption, (cs) => (cs?.isLLMdDefault ? llmdOption : undefined)),
      makeOverride(legacyOption, (cs) => (!cs?.isLLMdDefault ? legacyOption : undefined)),
    ];
    expect(resolveDeploymentMethodSuggestion(overrides, { isLLMdDefault: false })?.key).toBe(
      'legacy',
    );
  });

  it('2 options (no vLLM), isLLMdDefault ON: llm-d wins', () => {
    const overrides = [
      makeOverride(llmdOption, (cs) => (cs?.isLLMdDefault ? llmdOption : undefined)),
      makeOverride(legacyOption, (cs) => (!cs?.isLLMdDefault ? legacyOption : undefined)),
    ];
    expect(resolveDeploymentMethodSuggestion(overrides, { isLLMdDefault: true })?.key).toBe('llmd');
  });
});

describe('DeploymentMethodSelectField tracking', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = ({
    value,
    externalData,
    isEditing = false,
  }: {
    value?: DeploymentMethodFieldData;
    externalData?: { data: DeploymentMethodExternalData; loaded: boolean; loadError?: Error };
    isEditing?: boolean;
  } = {}) =>
    render(
      <DeploymentMethodSelectFieldComponent
        id="deploymentMethod"
        value={value}
        onChange={mockOnChange}
        externalData={externalData}
        isEditing={isEditing}
      />,
    );

  it('should fire fireDeployMethodSelected with undefined previousDeploymentMethod on first selection', () => {
    renderComponent({
      externalData: {
        data: {
          options: [
            { key: 'kserve', label: 'KServe', description: 'KServe deployment', order: 0 },
            { key: 'llmd', label: 'LLM-D', description: 'LLM-D deployment', order: 1 },
          ],
        },
        loaded: true,
      },
    });

    fireEvent.click(screen.getByTestId('deployment-method-kserve'));

    expect(mockFireDeployMethodSelected).toHaveBeenCalledWith({
      deploymentMethod: 'kserve',
      previousDeploymentMethod: undefined,
    });
  });

  it('should fire fireDeployMethodSelected with previous method when switching', () => {
    renderComponent({
      value: { method: 'kserve' },
      externalData: {
        data: {
          options: [
            { key: 'kserve', label: 'KServe', description: 'KServe deployment', order: 0 },
            { key: 'llmd', label: 'LLM-D', description: 'LLM-D deployment', order: 1 },
          ],
        },
        loaded: true,
      },
    });

    fireEvent.click(screen.getByTestId('deployment-method-llmd'));

    expect(mockFireDeployMethodSelected).toHaveBeenCalledWith({
      deploymentMethod: 'llmd',
      previousDeploymentMethod: 'kserve',
    });
  });

  it('should call onChange with the selected method', () => {
    renderComponent({
      externalData: {
        data: {
          options: [{ key: 'kserve', label: 'KServe', description: 'KServe deployment', order: 0 }],
        },
        loaded: true,
      },
    });

    fireEvent.click(screen.getByTestId('deployment-method-kserve'));

    expect(mockOnChange).toHaveBeenCalledWith({ method: 'kserve' });
  });

  it('should disable radio buttons when in editing mode', () => {
    renderComponent({
      value: { method: 'kserve' },
      externalData: {
        data: {
          options: [
            { key: 'kserve', label: 'KServe', description: 'KServe deployment', order: 0 },
            { key: 'llmd', label: 'LLM-D', description: 'LLM-D deployment', order: 1 },
          ],
        },
        loaded: true,
      },
      isEditing: true,
    });

    const radioInput = screen.getByRole('radio', { name: 'LLM-D' });
    expect(radioInput).toBeDisabled();
  });

  it('should render all provided options', () => {
    renderComponent({
      externalData: {
        data: {
          options: [
            { key: 'kserve', label: 'KServe', description: 'KServe deployment', order: 0 },
            { key: 'llmd', label: 'LLM-D', description: 'LLM-D deployment', order: 1 },
          ],
        },
        loaded: true,
      },
    });

    expect(screen.getByText('KServe')).toBeInTheDocument();
    expect(screen.getByText('LLM-D')).toBeInTheDocument();
  });
});
