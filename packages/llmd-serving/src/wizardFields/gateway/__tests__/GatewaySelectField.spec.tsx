import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GatewayOption } from '../../../api/services/gatewayDiscovery';
import { GatewaySelectField, GatewaySelectFieldData } from '../GatewaySelectField';

const GatewaySelectFieldComponent = GatewaySelectField.component;

const makeGateway = (name: string, namespace: string): GatewayOption => ({
  name,
  namespace,
});

describe('GatewaySelectFieldComponent', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = ({
    value = { selection: undefined },
    initialValue,
    externalData,
    isDisabled = false,
  }: {
    value?: GatewaySelectFieldData;
    initialValue?: GatewaySelectFieldData;
    externalData?: { data: GatewayOption[] | undefined; loaded: boolean; loadError?: Error };
    isDisabled?: boolean;
  } = {}) =>
    render(
      <GatewaySelectFieldComponent
        id="llmd-serving/gateway"
        value={value}
        initialValue={initialValue}
        onChange={mockOnChange}
        externalData={externalData}
        isDisabled={isDisabled}
      />,
    );

  const openDropdown = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('gateway-select'));
    });
  };

  describe('options based on gateways', () => {
    it('should show options for each gateway', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1'), makeGateway('gw-beta', 'ns-2')];

      renderComponent({
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      expect(screen.getByTestId('gw-alpha | ns-1')).toBeInTheDocument();
      expect(screen.getByTestId('gw-beta | ns-2')).toBeInTheDocument();
    });

    it('should filter out the maas-default-gateway', async () => {
      const gateways = [
        makeGateway('gw-alpha', 'ns-1'),
        makeGateway('maas-default-gateway', 'openshift-ingress'),
      ];

      renderComponent({
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      expect(screen.getByTestId('gw-alpha | ns-1')).toBeInTheDocument();
      expect(
        screen.queryByTestId('maas-default-gateway | openshift-ingress'),
      ).not.toBeInTheDocument();
    });

    it('should show the selected value in the toggle', () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selection: gateways[0] },
        externalData: { data: gateways, loaded: true },
      });

      expect(screen.getByTestId('gateway-select')).toHaveTextContent('gw-alpha | ns-1');
    });

    it('should show placeholder when nothing is selected', () => {
      renderComponent({
        externalData: { data: [makeGateway('gw-alpha', 'ns-1')], loaded: true },
      });

      expect(screen.getByTestId('gateway-select')).toHaveTextContent('Select a gateway');
    });
  });

  describe('selecting and deselecting', () => {
    it('should call onChange with the gateway when selecting', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1'), makeGateway('gw-beta', 'ns-2')];

      renderComponent({
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      await act(async () => {
        fireEvent.click(screen.getByText('gw-beta | ns-2'));
      });

      expect(mockOnChange).toHaveBeenCalledWith({ selection: gateways[1] });
    });

    it('should call onChange with undefined selection when deselecting the current value', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selection: gateways[0] },
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      await act(async () => {
        fireEvent.click(screen.getByRole('option', { name: /gw-alpha \| ns-1/ }));
      });

      expect(mockOnChange).toHaveBeenCalledWith({ selection: undefined });
    });
  });

  describe('deduplication', () => {
    it('should deduplicate gateways with the same name and namespace', async () => {
      const gateways = [
        makeGateway('gw-alpha', 'ns-1'),
        makeGateway('gw-alpha', 'ns-1'),
        makeGateway('gw-beta', 'ns-2'),
      ];

      renderComponent({
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(screen.getByTestId('gw-alpha | ns-1')).toBeInTheDocument();
      expect(screen.getByTestId('gw-beta | ns-2')).toBeInTheDocument();
    });

    it('should not deduplicate gateways with the same name but different namespace', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1'), makeGateway('gw-alpha', 'ns-2')];

      renderComponent({
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(screen.getByTestId('gw-alpha | ns-1')).toBeInTheDocument();
      expect(screen.getByTestId('gw-alpha | ns-2')).toBeInTheDocument();
    });
  });

  describe('error warning', () => {
    it('should show a warning when externalData has a loadError', () => {
      renderComponent({
        externalData: {
          data: undefined,
          loaded: false,
          loadError: new Error('Gateway discovery failed.'),
        },
      });

      expect(screen.getByTestId('gateway-select')).toHaveClass('pf-m-warning');
      expect(screen.getByText(/Gateway discovery failed\./)).toBeInTheDocument();
      expect(
        screen.getByText(/Ensure "model-serving-api" service is healthy and accessible\./),
      ).toBeInTheDocument();
    });
  });

  describe('empty gateways warning', () => {
    it('should show a warning when there are 0 gateways', () => {
      renderComponent({
        externalData: { data: [], loaded: true },
      });

      expect(
        screen.getByText(
          'No Gateways found. Make sure Gateway resources are created and configured',
        ),
      ).toBeInTheDocument();
    });

    it('should not show the empty warning when gateways exist', () => {
      renderComponent({
        externalData: { data: [makeGateway('gw-alpha', 'ns-1')], loaded: true },
      });

      expect(
        screen.queryByText(
          'No Gateways found. Make sure Gateway resources are created and configured',
        ),
      ).not.toBeInTheDocument();
    });

    it('should not show the empty warning when there is a loadError', () => {
      renderComponent({
        externalData: {
          data: [],
          loaded: false,
          loadError: new Error('Failed'),
        },
      });

      expect(
        screen.queryByText(
          'No Gateways found. Make sure Gateway resources are created and configured',
        ),
      ).not.toBeInTheDocument();
    });

    it('should not show the empty warning while data is still loading', () => {
      renderComponent({
        externalData: { data: undefined, loaded: false },
      });

      expect(
        screen.queryByText(
          'No Gateways found. Make sure Gateway resources are created and configured',
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe('missing selection warning on edit', () => {
    it('should show a warning when the selected value is not in the gateway list', () => {
      const missingGateway = makeGateway('gw-removed', 'ns-old');
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selection: missingGateway },
        initialValue: { selection: missingGateway },
        externalData: { data: gateways, loaded: true },
      });

      expect(
        screen.getByText(
          'The selected gateway was not found. The deployment may not work as expected.',
        ),
      ).toBeInTheDocument();
    });

    it('should still include the missing gateway as a selectable option', async () => {
      const missingGateway = makeGateway('gw-removed', 'ns-old');
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selection: missingGateway },
        initialValue: { selection: missingGateway },
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      expect(screen.getByTestId('gw-removed | ns-old')).toBeInTheDocument();
      expect(screen.getByTestId('gw-alpha | ns-1')).toBeInTheDocument();

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
    });

    it('should not show the missing warning when the selection exists in the list', () => {
      const gateway = makeGateway('gw-alpha', 'ns-1');

      renderComponent({
        value: { selection: gateway },
        initialValue: { selection: gateway },
        externalData: { data: [gateway], loaded: true },
      });

      expect(
        screen.queryByText(
          'The selected gateway was not found. The deployment may not work as expected.',
        ),
      ).not.toBeInTheDocument();
    });

    it('should not show the missing warning while data is still loading', () => {
      const gateway = makeGateway('gw-alpha', 'ns-1');

      renderComponent({
        value: { selection: gateway },
        initialValue: { selection: gateway },
        externalData: { data: undefined, loaded: false },
      });

      expect(
        screen.queryByText(
          'The selected gateway was not found. The deployment may not work as expected.',
        ),
      ).not.toBeInTheDocument();
    });

    it('should allow re-selecting the missing gateway via onChange', async () => {
      const missingGateway = makeGateway('gw-removed', 'ns-old');
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selection: undefined },
        initialValue: { selection: missingGateway },
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      await act(async () => {
        fireEvent.click(screen.getByText('gw-removed | ns-old'));
      });

      expect(mockOnChange).toHaveBeenCalledWith({ selection: missingGateway });
    });
  });
});

describe('GatewaySelectField definition', () => {
  it('should opt into resetting field data on dependency change', () => {
    expect(GatewaySelectField.shouldResetOnDependencyChange).toBe(true);
  });

  it('should declare project as a dependency via resolveDependencies', () => {
    const mockProject = { projectName: 'test-ns', setProjectName: jest.fn() };
    const deps = GatewaySelectField.reducerFunctions.resolveDependencies?.({
      project: mockProject,
    } as never);
    expect(deps).toEqual({ project: mockProject });
  });

  describe('getInitialFieldData', () => {
    const { getInitialFieldData } = GatewaySelectField.reducerFunctions;

    it('should return empty selection when no existing data is provided', () => {
      expect(getInitialFieldData(undefined)).toEqual({ selection: undefined });
    });

    it('should return existing data when provided', () => {
      const existing: GatewaySelectFieldData = {
        selection: makeGateway('gw-alpha', 'ns-1'),
      };
      expect(getInitialFieldData(existing)).toEqual(existing);
    });
  });
});
