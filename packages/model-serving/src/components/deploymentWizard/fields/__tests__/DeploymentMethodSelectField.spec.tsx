import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { fireDeployMethodSelected } from '../../../../tracking/modelServingTrackingConstants';
import {
  DeploymentMethodSelectFieldWizardField,
  type DeploymentMethodExternalData,
  type DeploymentMethodFieldData,
} from '../DeploymentMethodSelectField';

jest.mock('../../../../tracking/modelServingTrackingConstants', () => ({
  fireDeployMethodSelected: jest.fn(),
}));

const mockFireDeployMethodSelected = jest.mocked(fireDeployMethodSelected);

const DeploymentMethodSelectFieldComponent = DeploymentMethodSelectFieldWizardField.component;

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
