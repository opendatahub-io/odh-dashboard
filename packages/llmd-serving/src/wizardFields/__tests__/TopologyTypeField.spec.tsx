import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { fireTopologyTypeSelected } from '../../tracking/llmdTrackingConstants';
import { TopologyType, TopologyTypeLabels } from '../../types';
import {
  TopologyTypeFieldWizardField,
  type TopologyTypeExternalData,
  type TopologyTypeFieldData,
} from '../TopologyTypeField';

jest.mock('../../tracking/llmdTrackingConstants', () => ({
  fireTopologyTypeSelected: jest.fn(),
}));

const mockFireTopologyTypeSelected = jest.mocked(fireTopologyTypeSelected);

const TopologyTypeFieldComponent = TopologyTypeFieldWizardField.component;

describe('TopologyTypeField tracking', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = ({
    value,
    externalData,
  }: {
    value?: TopologyTypeFieldData;
    externalData?: { data: TopologyTypeExternalData; loaded: boolean; loadError?: Error };
  } = {}) =>
    render(
      <TopologyTypeFieldComponent
        id="llmd-serving/topology-type"
        value={value}
        onChange={mockOnChange}
        externalData={externalData}
      />,
    );

  const openDropdown = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('topology-type-select'));
    });
  };

  it('should fire fireTopologyTypeSelected with undefined previousPattern on first selection', async () => {
    renderComponent({
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText(TopologyTypeLabels[TopologyType.SINGLE_NODE]));
    });

    expect(mockFireTopologyTypeSelected).toHaveBeenCalledWith({
      llmdComposablePattern: TopologyType.SINGLE_NODE,
      previousPattern: undefined,
    });
  });

  it('should fire fireTopologyTypeSelected with previous pattern when switching', async () => {
    renderComponent({
      value: { topologyType: TopologyType.SINGLE_NODE },
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [{ metadata: { name: 'multi-config' } } as never],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText(TopologyTypeLabels[TopologyType.MULTI_NODE]));
    });

    expect(mockFireTopologyTypeSelected).toHaveBeenCalledWith({
      llmdComposablePattern: TopologyType.MULTI_NODE,
      previousPattern: TopologyType.SINGLE_NODE,
    });
  });

  it('should call onChange with the selected topology type', async () => {
    renderComponent({
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText(TopologyTypeLabels[TopologyType.SINGLE_NODE]));
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      topologyType: TopologyType.SINGLE_NODE,
    });
  });

  it('should render all topology type options', async () => {
    renderComponent({
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    expect(screen.getByText(TopologyTypeLabels[TopologyType.SINGLE_NODE])).toBeInTheDocument();
    expect(screen.getByText(TopologyTypeLabels[TopologyType.MULTI_NODE])).toBeInTheDocument();
    expect(
      screen.getByText(TopologyTypeLabels[TopologyType.SINGLE_NODE_DISAGGREGATED]),
    ).toBeInTheDocument();
    expect(
      screen.getByText(TopologyTypeLabels[TopologyType.MULTI_NODE_DISAGGREGATED]),
    ).toBeInTheDocument();
  });
});
