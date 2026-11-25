import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { NimMetricsGraphTypes } from '../../const';
import { NimMetricGraphDefinition } from '../../types';
import NimPerformanceGraphs from '../NimPerformanceGraphs';
import NIMKVCacheUsageGraph from '../NIMKVCacheUsageGraph';
import NIMTokensCountGraph from '../NIMTokensCountGraph';
import NIMTimeToFirstTokenGraph from '../NIMTimeForFirstTokenGraphs';
import NIMTimePerOutputTokenGraph from '../NIMTimePerOutputTokenGraph';
import NIMRequestsOutcomesGraph from '../NIMRequestsOutcomesGraph';
import NIMCurrentRequestsGraph from '../NIMCurrentRequestsGraph';

jest.mock('../NIMKVCacheUsageGraph', () => jest.fn(() => null));
jest.mock('../NIMTokensCountGraph', () => jest.fn(() => null));
jest.mock('../NIMTimeForFirstTokenGraphs', () => jest.fn(() => null));
jest.mock('../NIMTimePerOutputTokenGraph', () => jest.fn(() => null));
jest.mock('../NIMRequestsOutcomesGraph', () => jest.fn(() => null));
jest.mock('../NIMCurrentRequestsGraph', () => jest.fn(() => null));

const metricsProps = {
  namespace: 'test-project',
  timeframe: TimeframeTitle.ONE_HOUR,
  end: 1700000000,
};

describe('NimPerformanceGraphs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should explain an unknown graph type without preventing supported graphs from rendering', () => {
    const unknownGraph: NimMetricGraphDefinition = {
      title: 'New metric',
      // Simulate an unrecognized graph type received from the backend.
      type: 'UNKNOWN_GRAPH' as NimMetricsGraphTypes,
      queries: [],
    };
    const supportedGraph: NimMetricGraphDefinition = {
      title: 'Current requests',
      type: NimMetricsGraphTypes.CURRENT_REQUESTS,
      queries: [],
    };

    render(
      <NimPerformanceGraphs {...metricsProps} graphDefinitions={[unknownGraph, supportedGraph]} />,
    );

    const unsupportedState = screen.getByTestId('unsupported-graph-type');
    expect(unsupportedState).toHaveTextContent('Unsupported graph type');
    expect(unsupportedState).toHaveTextContent(
      'New metric cannot be displayed because its graph type is not supported.',
    );
    expect(jest.mocked(NIMCurrentRequestsGraph)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(NIMCurrentRequestsGraph)).toHaveBeenCalledWith(
      { ...metricsProps, graphDefinition: supportedGraph },
      {},
    );
  });

  it.each([
    { type: NimMetricsGraphTypes.KV_CACHE, Graph: NIMKVCacheUsageGraph },
    { type: NimMetricsGraphTypes.TOKENS_COUNT, Graph: NIMTokensCountGraph },
    { type: NimMetricsGraphTypes.TIME_TO_FIRST_TOKEN, Graph: NIMTimeToFirstTokenGraph },
    { type: NimMetricsGraphTypes.TIME_PER_OUTPUT_TOKEN, Graph: NIMTimePerOutputTokenGraph },
    { type: NimMetricsGraphTypes.REQUEST_OUTCOMES, Graph: NIMRequestsOutcomesGraph },
    { type: NimMetricsGraphTypes.CURRENT_REQUESTS, Graph: NIMCurrentRequestsGraph },
  ])('should render $type with unchanged props and no unsupported state', ({ type, Graph }) => {
    const graphDefinition: NimMetricGraphDefinition = {
      title: 'Supported metric',
      type,
      queries: [{ title: 'Metric query', query: 'test_metric' }],
    };

    render(<NimPerformanceGraphs {...metricsProps} graphDefinitions={[graphDefinition]} />);

    expect(jest.mocked(Graph)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Graph)).toHaveBeenCalledWith({ ...metricsProps, graphDefinition }, {});
    expect(screen.queryByTestId('unsupported-graph-type')).not.toBeInTheDocument();
  });

  it('should not show an unsupported state when no graphs are configured', () => {
    render(<NimPerformanceGraphs {...metricsProps} graphDefinitions={[]} />);

    expect(screen.queryByTestId('unsupported-graph-type')).not.toBeInTheDocument();
  });
});
