import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { KserveMetricsGraphTypes } from '../../const';
import { KserveMetricGraphDefinition } from '../../types';
import KservePerformanceGraphs from '../KservePerformanceGraphs';
import KserveRequestCountGraph from '../KserveRequestCountGraph';
import KserveMeanLatencyGraph from '../KserveMeanLatencyGraph';
import KserveCpuUsageGraph from '../KserveCpuUsageGraph';
import KserveMemoryUsageGraph from '../KserveMemoryUsageGraph';

jest.mock('../KserveRequestCountGraph', () => jest.fn(() => null));
jest.mock('../KserveMeanLatencyGraph', () => jest.fn(() => null));
jest.mock('../KserveCpuUsageGraph', () => jest.fn(() => null));
jest.mock('../KserveMemoryUsageGraph', () => jest.fn(() => null));

const metricsProps = {
  namespace: 'test-project',
  timeframe: TimeframeTitle.ONE_HOUR,
  end: 1700000000,
};

describe('KservePerformanceGraphs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should explain an unknown graph type without preventing supported graphs from rendering', () => {
    const unknownGraph: KserveMetricGraphDefinition = {
      title: 'New metric',
      // Simulate an unrecognized graph type received from the backend.
      type: 'UNKNOWN_GRAPH' as KserveMetricsGraphTypes,
      queries: [],
    };
    const supportedGraph: KserveMetricGraphDefinition = {
      title: 'Request count',
      type: KserveMetricsGraphTypes.REQUEST_COUNT,
      queries: [],
    };

    render(
      <KservePerformanceGraphs
        {...metricsProps}
        graphDefinitions={[unknownGraph, supportedGraph]}
      />,
    );

    const unsupportedState = screen.getByTestId('unsupported-graph-type');
    expect(unsupportedState).toHaveTextContent('Unsupported graph type');
    expect(unsupportedState).toHaveTextContent(
      'New metric cannot be displayed because its graph type is not supported.',
    );
    expect(jest.mocked(KserveRequestCountGraph)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(KserveRequestCountGraph)).toHaveBeenCalledWith(
      { ...metricsProps, graphDefinition: supportedGraph },
      {},
    );
  });

  it.each([
    { type: KserveMetricsGraphTypes.REQUEST_COUNT, Graph: KserveRequestCountGraph },
    { type: KserveMetricsGraphTypes.MEAN_LATENCY, Graph: KserveMeanLatencyGraph },
    { type: KserveMetricsGraphTypes.CPU_USAGE, Graph: KserveCpuUsageGraph },
    { type: KserveMetricsGraphTypes.MEMORY_USAGE, Graph: KserveMemoryUsageGraph },
  ])('should render $type with unchanged props and no unsupported state', ({ type, Graph }) => {
    const graphDefinition: KserveMetricGraphDefinition = {
      title: 'Supported metric',
      type,
      queries: [{ title: 'Metric query', query: 'test_metric' }],
    };

    render(<KservePerformanceGraphs {...metricsProps} graphDefinitions={[graphDefinition]} />);

    expect(jest.mocked(Graph)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Graph)).toHaveBeenCalledWith({ ...metricsProps, graphDefinition }, {});
    expect(screen.queryByTestId('unsupported-graph-type')).not.toBeInTheDocument();
  });

  it('should not show an unsupported state when no graphs are configured', () => {
    render(<KservePerformanceGraphs {...metricsProps} graphDefinitions={[]} />);

    expect(screen.queryByTestId('unsupported-graph-type')).not.toBeInTheDocument();
  });
});
