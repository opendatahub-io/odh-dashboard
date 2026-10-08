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

const optionTestId = (label: string) =>
  `select-multi-typeahead-${label.replace(/[^a-zA-Z0-9]+/g, '-')}`;

describe('GatewaySelectFieldComponent', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = ({
    value = { selections: [] },
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

  const getCombobox = () => screen.getByRole('combobox', { name: 'Gateway selection' });

  const openDropdown = async () => {
    await act(async () => {
      fireEvent.keyDown(getCombobox(), { key: 'ArrowDown' });
    });
  };

  const selectOptionByKeyboard = async (optionLabel: string) => {
    const combobox = getCombobox();
    await act(async () => {
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    });
    // Focus the matching option, then select with Enter.
    const optionCount = screen.getAllByTestId(/select-multi-typeahead-/).length;
    for (let i = 0; i < optionCount; i += 1) {
      const focusedId = combobox.getAttribute('aria-activedescendant');
      const focused = focusedId ? document.getElementById(focusedId) : null;
      if (focused && focused.textContent.includes(optionLabel)) {
        await act(async () => {
          fireEvent.keyDown(combobox, { key: 'Enter' });
        });
        return;
      }
      await act(async () => {
        fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      });
    }
    throw new Error(`Option not found for keyboard selection: ${optionLabel}`);
  };

  describe('options based on gateways', () => {
    it('should show options for each gateway', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1'), makeGateway('gw-beta', 'ns-2')];

      renderComponent({
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      expect(screen.getByTestId(optionTestId('gw-alpha | ns-1'))).toBeInTheDocument();
      expect(screen.getByTestId(optionTestId('gw-beta | ns-2'))).toBeInTheDocument();
    });

    it('should filter out gateways listed in hiddenOptions', async () => {
      const maasGateway = makeGateway('maas-default-gateway', 'openshift-ingress');
      const gateways = [makeGateway('gw-alpha', 'ns-1'), maasGateway];

      renderComponent({
        value: { selections: [], hiddenOptions: [maasGateway] },
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      expect(screen.getByTestId(optionTestId('gw-alpha | ns-1'))).toBeInTheDocument();
      expect(
        screen.queryByTestId(optionTestId('maas-default-gateway | openshift-ingress')),
      ).not.toBeInTheDocument();
    });

    it('should show selected values as chips in the toggle', () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1'), makeGateway('gw-beta', 'ns-2')];

      renderComponent({
        value: { selections: gateways },
        externalData: { data: gateways, loaded: true },
      });

      expect(screen.getByTestId('gateway-select')).toHaveTextContent('gw-alpha | ns-1');
      expect(screen.getByTestId('gateway-select')).toHaveTextContent('gw-beta | ns-2');
    });

    it('should show placeholder when nothing is selected', () => {
      renderComponent({
        externalData: { data: [makeGateway('gw-alpha', 'ns-1')], loaded: true },
      });

      expect(screen.getByRole('combobox', { name: 'Gateway selection' })).toHaveAttribute(
        'placeholder',
        'Select gateways',
      );
    });
  });

  describe('selecting and deselecting', () => {
    it('should call onChange with the gateway when selecting', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1'), makeGateway('gw-beta', 'ns-2')];

      renderComponent({
        externalData: { data: gateways, loaded: true },
      });

      await selectOptionByKeyboard('gw-beta | ns-2');

      expect(mockOnChange).toHaveBeenCalledWith({ selections: [gateways[1]] });
    });

    it('should call onChange with multiple selections when selecting additional gateways', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1'), makeGateway('gw-beta', 'ns-2')];

      renderComponent({
        value: { selections: [gateways[0]] },
        externalData: { data: gateways, loaded: true },
      });

      await selectOptionByKeyboard('gw-beta | ns-2');

      expect(mockOnChange).toHaveBeenCalledWith({ selections: gateways });
    });

    it('should call onChange with empty selections when deselecting the current value', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selections: gateways },
        externalData: { data: gateways, loaded: true },
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Remove gw-alpha | ns-1'));
      });

      expect(mockOnChange).toHaveBeenCalledWith({ selections: [] });
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

      expect(screen.getByTestId(optionTestId('gw-alpha | ns-1'))).toBeInTheDocument();
      expect(screen.getByTestId(optionTestId('gw-beta | ns-2'))).toBeInTheDocument();
      expect(screen.getAllByTestId(/select-multi-typeahead-/)).toHaveLength(2);
    });

    it('should not deduplicate gateways with the same name but different namespace', async () => {
      const gateways = [makeGateway('gw-alpha', 'ns-1'), makeGateway('gw-alpha', 'ns-2')];

      renderComponent({
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      expect(screen.getByTestId(optionTestId('gw-alpha | ns-1'))).toBeInTheDocument();
      expect(screen.getByTestId(optionTestId('gw-alpha | ns-2'))).toBeInTheDocument();
      expect(screen.getAllByTestId(/select-multi-typeahead-/)).toHaveLength(2);
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

      expect(screen.getByText(/Gateway discovery failed\./)).toBeInTheDocument();
      expect(
        screen.getByText(/Ensure "model-serving-api" service is healthy and accessible\./),
      ).toBeInTheDocument();
    });

    it('should not show a loadError warning when isDisabled', () => {
      renderComponent({
        externalData: {
          data: undefined,
          loaded: false,
          loadError: new Error('Gateway discovery failed.'),
        },
        isDisabled: true,
      });

      expect(screen.queryByText(/Gateway discovery failed\./)).not.toBeInTheDocument();
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

    it('should not show the empty warning when isDisabled', () => {
      renderComponent({
        externalData: { data: [], loaded: true },
        isDisabled: true,
      });

      expect(
        screen.queryByText(
          'No Gateways found. Make sure Gateway resources are created and configured',
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe('missing selection warning on edit', () => {
    it('should show a warning when a selected value is not in the gateway list', () => {
      const missingGateway = makeGateway('gw-removed', 'ns-old');
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selections: [missingGateway] },
        initialValue: { selections: [missingGateway] },
        externalData: { data: gateways, loaded: true },
      });

      expect(
        screen.getByText(
          'The selected gateway was not found. The deployment may not work as expected.',
        ),
      ).toBeInTheDocument();
    });

    it('should show a plural warning when multiple selected values are missing', () => {
      const missingGateways = [
        makeGateway('gw-removed-1', 'ns-old'),
        makeGateway('gw-removed-2', 'ns-old'),
      ];

      renderComponent({
        value: { selections: missingGateways },
        initialValue: { selections: missingGateways },
        externalData: { data: [makeGateway('gw-alpha', 'ns-1')], loaded: true },
      });

      expect(
        screen.getByText(
          'One or more selected gateways were not found. The deployment may not work as expected.',
        ),
      ).toBeInTheDocument();
    });

    it('should keep a currently selected missing gateway as an option without initialValue', async () => {
      const missingGateway = makeGateway('gw-removed', 'ns-old');

      renderComponent({
        value: { selections: [missingGateway] },
        externalData: { data: [makeGateway('gw-alpha', 'ns-1')], loaded: true },
      });

      expect(screen.getByTestId('gateway-select')).toHaveTextContent('gw-removed | ns-old');
      expect(
        screen.getByText(
          'The selected gateway was not found. The deployment may not work as expected.',
        ),
      ).toBeInTheDocument();

      await openDropdown();
      expect(screen.getByTestId(optionTestId('gw-removed | ns-old'))).toBeInTheDocument();
    });

    it('should still include the missing gateway as a selectable option', async () => {
      const missingGateway = makeGateway('gw-removed', 'ns-old');
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selections: [missingGateway] },
        initialValue: { selections: [missingGateway] },
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      expect(screen.getByTestId(optionTestId('gw-removed | ns-old'))).toBeInTheDocument();
      expect(screen.getByTestId(optionTestId('gw-alpha | ns-1'))).toBeInTheDocument();
      expect(screen.getAllByTestId(/select-multi-typeahead-/)).toHaveLength(2);
    });

    it('should not show the missing warning when the selection exists in the list', () => {
      const gateway = makeGateway('gw-alpha', 'ns-1');

      renderComponent({
        value: { selections: [gateway] },
        initialValue: { selections: [gateway] },
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
        value: { selections: [gateway] },
        initialValue: { selections: [gateway] },
        externalData: { data: undefined, loaded: false },
      });

      expect(
        screen.queryByText(
          'The selected gateway was not found. The deployment may not work as expected.',
        ),
      ).not.toBeInTheDocument();
    });

    it('should not show the missing warning when isDisabled', () => {
      const missingGateway = makeGateway('gw-removed', 'ns-old');

      renderComponent({
        value: { selections: [missingGateway] },
        initialValue: { selections: [missingGateway] },
        externalData: { data: [makeGateway('gw-alpha', 'ns-1')], loaded: true },
        isDisabled: true,
      });

      expect(
        screen.queryByText(
          'The selected gateway was not found. The deployment may not work as expected.',
        ),
      ).not.toBeInTheDocument();
    });

    it('should not add the initial value as a fallback option when it is in hiddenOptions', async () => {
      const hiddenGateway = makeGateway('maas-default-gateway', 'openshift-ingress');
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selections: [], hiddenOptions: [hiddenGateway] },
        initialValue: { selections: [hiddenGateway] },
        externalData: { data: gateways, loaded: true },
      });

      await openDropdown();

      expect(
        screen.queryByTestId(optionTestId('maas-default-gateway | openshift-ingress')),
      ).not.toBeInTheDocument();
      expect(screen.getAllByTestId(/select-multi-typeahead-/)).toHaveLength(1);
    });

    it('should allow re-selecting the missing gateway via onChange', async () => {
      const missingGateway = makeGateway('gw-removed', 'ns-old');
      const gateways = [makeGateway('gw-alpha', 'ns-1')];

      renderComponent({
        value: { selections: [] },
        initialValue: { selections: [missingGateway] },
        externalData: { data: gateways, loaded: true },
      });

      await selectOptionByKeyboard('gw-removed | ns-old');

      expect(mockOnChange).toHaveBeenCalledWith({ selections: [missingGateway] });
    });
  });
});

describe('GatewaySelectField definition', () => {
  it('should opt into resetting field data on dependency change', () => {
    const mockDeps = { project: { projectName: 'test', setProjectName: jest.fn() } };
    expect(GatewaySelectField.shouldResetOnDependencyChange?.(mockDeps, mockDeps)).toBe(true);
  });

  it('should declare project as a dependency via resolveDependencies', () => {
    const mockProject = { projectName: 'test-ns', setProjectName: jest.fn() };
    const deps = GatewaySelectField.reducerFunctions.resolveDependencies?.({
      project: mockProject,
    } as never);
    expect(deps).toEqual({ project: mockProject });
  });

  describe('setFieldData', () => {
    it('should return the value unchanged', () => {
      const value: GatewaySelectFieldData = { selections: [makeGateway('gw-alpha', 'ns-1')] };
      expect(GatewaySelectField.reducerFunctions.setFieldData(value)).toBe(value);
    });
  });

  describe('getInitialFieldData', () => {
    const { getInitialFieldData } = GatewaySelectField.reducerFunctions;

    it('should return empty selections when no existing data is provided', () => {
      expect(getInitialFieldData(undefined)).toEqual({ selections: [] });
    });

    it('should return existing data when provided', () => {
      const existing: GatewaySelectFieldData = {
        selections: [makeGateway('gw-alpha', 'ns-1')],
      };
      expect(getInitialFieldData(existing)).toEqual(existing);
    });
  });

  describe('getReviewSections', () => {
    const mockWizardState = {} as never;

    it('should return a gateway item when selections exist', () => {
      const gateway = makeGateway('gw-alpha', 'ns-1');
      const sections =
        GatewaySelectField.getReviewSections?.(
          { selections: [gateway, makeGateway('gw-beta', 'ns-2')] },
          mockWizardState,
        ) ?? [];

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Advanced settings');
      expect(sections[0].items).toHaveLength(1);
      expect(sections[0].items[0].label).toBe('Gateways');
      expect(sections[0].items[0].value(mockWizardState)).toBe('gw-alpha | ns-1, gw-beta | ns-2');
    });

    it('should return an empty items list when no selections exist', () => {
      const sections =
        GatewaySelectField.getReviewSections?.({ selections: [] }, mockWizardState) ?? [];

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Advanced settings');
      expect(sections[0].items).toHaveLength(0);
    });
  });
});
