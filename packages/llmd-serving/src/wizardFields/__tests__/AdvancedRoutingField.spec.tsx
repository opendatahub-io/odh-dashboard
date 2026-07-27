import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { fireRoutingSelected } from '../../tracking/llmdTrackingConstants';
import { ConfigType } from '../../types';
import {
  AdvancedRoutingFieldWizardField,
  type AdvancedRoutingExternalData,
  type AdvancedRoutingFieldData,
} from '../AdvancedRoutingField';

jest.mock('../../tracking/llmdTrackingConstants', () => ({
  fireRoutingSelected: jest.fn(),
}));

const mockFireRoutingSelected = jest.mocked(fireRoutingSelected);

const AdvancedRoutingFieldComponent = AdvancedRoutingFieldWizardField.component;

describe('AdvancedRoutingField tracking', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const routerConfig1 = mockLLMInferenceServiceConfigK8sResource({
    name: 'router-config-1',
    displayName: 'Router Config One',
    configType: ConfigType.ROUTER,
  });

  const routerConfig2 = mockLLMInferenceServiceConfigK8sResource({
    name: 'router-config-2',
    displayName: 'Router Config Two',
    configType: ConfigType.ROUTER,
  });

  const renderComponent = ({
    value,
    externalData,
    dependencies,
  }: {
    value?: AdvancedRoutingFieldData;
    externalData?: { data: AdvancedRoutingExternalData; loaded: boolean; loadError?: Error };
    dependencies?: Record<string, unknown>;
  } = {}) =>
    render(
      <AdvancedRoutingFieldComponent
        id="llmd-serving/advanced-routing"
        value={value}
        onChange={mockOnChange}
        externalData={externalData}
        dependencies={dependencies}
      />,
    );

  const openDropdown = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('routing-config-select'));
    });
  };

  it('should fire fireRoutingSelected with isDefaultRouting true when default routing is selected', async () => {
    renderComponent({
      value: { selectedConfig: routerConfig1 },
      externalData: {
        data: { routerConfigs: [routerConfig1, routerConfig2] },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText('Default optimized routing'));
    });

    expect(mockFireRoutingSelected).toHaveBeenCalledWith({
      routingConfigurationId: '__default-optimized-routing__',
      isDefaultRouting: true,
    });
  });

  it('should fire fireRoutingSelected with isDefaultRouting false when a specific config is selected', async () => {
    renderComponent({
      externalData: {
        data: { routerConfigs: [routerConfig1, routerConfig2] },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText('Router Config One'));
    });

    expect(mockFireRoutingSelected).toHaveBeenCalledWith({
      routingConfigurationId: 'router-config-1',
      isDefaultRouting: false,
    });
  });

  it('should fire fireRoutingSelected for a different config selection', async () => {
    renderComponent({
      value: { selectedConfig: routerConfig1 },
      externalData: {
        data: { routerConfigs: [routerConfig1, routerConfig2] },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText('Router Config Two'));
    });

    expect(mockFireRoutingSelected).toHaveBeenCalledWith({
      routingConfigurationId: 'router-config-2',
      isDefaultRouting: false,
    });
  });

  it('should call onChange with selectedConfig when a specific config is selected', async () => {
    renderComponent({
      externalData: {
        data: { routerConfigs: [routerConfig1] },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText('Router Config One'));
    });

    expect(mockOnChange).toHaveBeenCalledWith({ selectedConfig: routerConfig1 });
  });

  it('should call onChange with undefined selectedConfig when default routing is selected', async () => {
    renderComponent({
      value: { selectedConfig: routerConfig1 },
      externalData: {
        data: { routerConfigs: [routerConfig1] },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText('Default optimized routing'));
    });

    expect(mockOnChange).toHaveBeenCalledWith({ selectedConfig: undefined });
  });

  it('should render the default routing option and config options', async () => {
    renderComponent({
      externalData: {
        data: { routerConfigs: [routerConfig1, routerConfig2] },
        loaded: true,
      },
    });

    await openDropdown();

    expect(screen.getByTestId('routing-config-option-default')).toBeInTheDocument();
    expect(screen.getByTestId('routing-config-option-router-config-1')).toBeInTheDocument();
    expect(screen.getByTestId('routing-config-option-router-config-2')).toBeInTheDocument();
  });
});
