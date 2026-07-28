import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { fireRoutingSelected } from '../../tracking/llmdTrackingConstants';
import { ConfigType, TopologyType } from '../../types';
import {
  AdvancedRoutingFieldWizardField,
  type AdvancedRoutingExternalData,
  type AdvancedRoutingFieldData,
} from '../AdvancedRoutingField';

jest.mock('../../tracking/llmdTrackingConstants', () => ({
  fireRoutingSelected: jest.fn(),
}));

const mockFireRoutingSelected = jest.mocked(fireRoutingSelected);

const { getInitialFieldData, validationSchema } = AdvancedRoutingFieldWizardField.reducerFunctions;
const AdvancedRoutingFieldComponent = AdvancedRoutingFieldWizardField.component;

const mockConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'router-config-1',
  displayName: 'Router Config 1',
});

const mockCompatibleConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'compatible-config',
  displayName: 'Compatible Config',
  supportedTopologies: [TopologyType.SINGLE_NODE],
});

const mockIncompatibleConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'incompatible-config',
  displayName: 'Incompatible Config',
  supportedTopologies: [TopologyType.MULTI_NODE],
});

beforeEach(() => {
  jest.clearAllMocks();
});

// --- getInitialFieldData ---

describe('AdvancedRoutingField getInitialFieldData', () => {
  it('should return existing field data when provided (edit flow)', () => {
    const existing: AdvancedRoutingFieldData = { selectedConfig: mockConfig };

    const result = getInitialFieldData(existing);

    expect(result).toBe(existing);
  });

  it('should return default state when no existing data', () => {
    const result = getInitialFieldData(undefined);

    expect(result).toEqual({ selectedConfig: undefined });
  });

  it('should preserve configRef from edit extractor for resolution by the component', () => {
    const existing: AdvancedRoutingFieldData = { configRef: 'some-config' };

    const result = getInitialFieldData(existing);

    expect(result).toBe(existing);
  });

  it('should fall through to defaults when neither selectedConfig nor configRef is set', () => {
    const existing: AdvancedRoutingFieldData = {};

    const result = getInitialFieldData(existing);

    expect(result).toEqual({ selectedConfig: undefined });
  });
});

// --- validationSchema ---

describe('AdvancedRoutingField validationSchema', () => {
  if (!validationSchema) {
    throw new Error('validationSchema is required');
  }
  const schema = validationSchema;

  it('should accept undefined selectedConfig (default routing)', () => {
    const result = schema.safeParse({ selectedConfig: undefined });
    expect(result.success).toBe(true);
  });

  it('should accept a valid config object', () => {
    const result = schema.safeParse({ selectedConfig: mockConfig });
    expect(result.success).toBe(true);
  });

  it('should accept configRef string', () => {
    const result = schema.safeParse({ configRef: 'my-config' });
    expect(result.success).toBe(true);
  });
});

// --- shouldResetOnDependencyChange ---

describe('AdvancedRoutingField shouldResetOnDependencyChange', () => {
  const { shouldResetOnDependencyChange } = AdvancedRoutingFieldWizardField;
  if (!shouldResetOnDependencyChange) {
    throw new Error('shouldResetOnDependencyChange is required');
  }
  const resetCheck = shouldResetOnDependencyChange;

  it('should reset when topology type changes', () => {
    const prev = { topologyType: { topologyType: TopologyType.MULTI_NODE } };
    const next = { topologyType: { topologyType: TopologyType.SINGLE_NODE_DISAGGREGATED } };

    expect(resetCheck(prev, next)).toBe(true);
  });

  it('should not reset when topology type stays the same', () => {
    const prev = { topologyType: { topologyType: TopologyType.MULTI_NODE } };
    const next = { topologyType: { topologyType: TopologyType.MULTI_NODE } };

    expect(resetCheck(prev, next)).toBe(false);
  });

  it('should reset when topology type goes from defined to undefined', () => {
    const prev = { topologyType: { topologyType: TopologyType.MULTI_NODE } };
    const next = { topologyType: undefined };

    expect(resetCheck(prev, next)).toBe(true);
  });

  it('should reset when topology type goes from undefined to defined', () => {
    const prev = { topologyType: undefined };
    const next = { topologyType: { topologyType: TopologyType.SINGLE_NODE } };

    expect(resetCheck(prev, next)).toBe(true);
  });

  it('should not reset when both are undefined', () => {
    const prev = { topologyType: undefined };
    const next = { topologyType: undefined };

    expect(resetCheck(prev, next)).toBe(false);
  });
});

// --- Tracking ---

describe('AdvancedRoutingField tracking', () => {
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
        onChange={jest.fn()}
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

// --- Incompatible config handling ---

describe('AdvancedRoutingField component — incompatible config handling', () => {
  const buildExternalData = (
    configs: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[],
  ): { data: AdvancedRoutingExternalData; loaded: boolean } => ({
    data: { routerConfigs: configs },
    loaded: true,
  });

  const fieldId = 'llmd-serving/advanced-routing';

  const renderAndResolveIncompatible = async (onChange: jest.Mock) => {
    const allConfigs = [mockCompatibleConfig, mockIncompatibleConfig];
    const result = render(
      <AdvancedRoutingFieldComponent
        id={fieldId}
        value={{ configRef: 'incompatible-config' }}
        onChange={onChange}
        externalData={buildExternalData(allConfigs)}
        dependencies={{ topologyType: { topologyType: TopologyType.SINGLE_NODE } }}
      />,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ selectedConfig: mockIncompatibleConfig });
    });

    result.rerender(
      <AdvancedRoutingFieldComponent
        id={fieldId}
        value={{ selectedConfig: mockIncompatibleConfig, configRef: 'incompatible-config' }}
        onChange={onChange}
        externalData={buildExternalData(allConfigs)}
        dependencies={{ topologyType: { topologyType: TopologyType.SINGLE_NODE } }}
      />,
    );

    return result;
  };

  it('should resolve an incompatible configRef and show a warning', async () => {
    const onChange = jest.fn();
    await renderAndResolveIncompatible(onChange);

    expect(
      screen.getByText(/is not compatible with the current topology type/),
    ).toBeInTheDocument();
  });

  it('should include the incompatible config as a selectable option in the dropdown', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await renderAndResolveIncompatible(onChange);

    await user.click(screen.getByTestId('routing-config-select'));

    expect(screen.getByTestId('routing-config-option-incompatible-config')).toBeInTheDocument();
  });

  it('should hide the warning when a compatible config is selected', async () => {
    const allConfigs = [mockCompatibleConfig, mockIncompatibleConfig];
    const onChange = jest.fn();

    const { rerender } = await renderAndResolveIncompatible(onChange);

    rerender(
      <AdvancedRoutingFieldComponent
        id={fieldId}
        value={{ selectedConfig: mockCompatibleConfig, configRef: 'incompatible-config' }}
        onChange={onChange}
        externalData={buildExternalData(allConfigs)}
        dependencies={{ topologyType: { topologyType: TopologyType.SINGLE_NODE } }}
      />,
    );

    expect(
      screen.queryByText(/is not compatible with the current topology type/),
    ).not.toBeInTheDocument();
  });

  it('should keep the incompatible option in the dropdown after selecting a different option', async () => {
    const user = userEvent.setup();
    const allConfigs = [mockCompatibleConfig, mockIncompatibleConfig];
    const onChange = jest.fn();

    const { rerender } = await renderAndResolveIncompatible(onChange);

    await user.click(screen.getByTestId('routing-config-select'));
    await user.click(screen.getByTestId('routing-config-option-default'));

    rerender(
      <AdvancedRoutingFieldComponent
        id={fieldId}
        value={{ selectedConfig: undefined, configRef: 'incompatible-config' }}
        onChange={onChange}
        externalData={buildExternalData(allConfigs)}
        dependencies={{ topologyType: { topologyType: TopologyType.SINGLE_NODE } }}
      />,
    );

    await user.click(screen.getByTestId('routing-config-select'));
    expect(screen.getByTestId('routing-config-option-incompatible-config')).toBeInTheDocument();
  });

  it('should resolve a compatible configRef and show it selected without warning', async () => {
    const onChange = jest.fn();

    render(
      <AdvancedRoutingFieldComponent
        id={fieldId}
        value={{ configRef: 'compatible-config' }}
        onChange={onChange}
        externalData={buildExternalData([mockCompatibleConfig, mockIncompatibleConfig])}
        dependencies={{ topologyType: { topologyType: TopologyType.SINGLE_NODE } }}
      />,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ selectedConfig: mockCompatibleConfig });
    });

    expect(
      screen.queryByText(/is not compatible with the current topology type/),
    ).not.toBeInTheDocument();
  });

  it('should clear configRef when it references a deleted config', async () => {
    const onChange = jest.fn();

    render(
      <AdvancedRoutingFieldComponent
        id={fieldId}
        value={{ configRef: 'deleted-config' }}
        onChange={onChange}
        externalData={buildExternalData([mockCompatibleConfig])}
        dependencies={{ topologyType: { topologyType: TopologyType.SINGLE_NODE } }}
      />,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ configRef: undefined });
    });

    expect(
      screen.queryByText(/is not compatible with the current topology type/),
    ).not.toBeInTheDocument();
  });
});
