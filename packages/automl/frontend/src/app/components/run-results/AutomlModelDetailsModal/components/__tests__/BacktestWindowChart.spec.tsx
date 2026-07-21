/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BacktestWindowChart from '~/app/components/run-results/AutomlModelDetailsModal/components/BacktestWindowChart';
import type { BackTestingPerWindowMetric } from '~/app/types';
import type { ChartSeries } from '~/app/components/run-results/AutomlModelDetailsModal/components/BacktestCurveChart';

// Store the last rendered series data for test assertions
let lastRenderedSeries: ChartSeries[] | undefined;

jest.mock('~/app/components/InlineTooltip', () => ({
  __esModule: true,
  default: ({ text, tooltip }: { text: string; tooltip: string }) => (
    <span data-testid="inline-tooltip" title={tooltip}>
      {text}
    </span>
  ),
}));

jest.mock(
  '~/app/components/run-results/AutomlModelDetailsModal/components/BacktestCurveChart',
  () => ({
    __esModule: true,
    default: ({ ariaDesc, series }: { ariaDesc: string; series: ChartSeries[] }) => {
      lastRenderedSeries = series;
      return <div data-testid="backtest-curve-chart" aria-label={ariaDesc} />;
    },
  }),
);

const mockPerWindowMetrics: BackTestingPerWindowMetric[] = [
  {
    window_id: 0,
    test_start: '2024-01-01',
    test_end: '2024-01-07',
    metrics: {
      RMSE: 0.5,
      MAE: 0.3,
      MASE: 0.8,
      MAPE: 0.15,
    },
  },
  {
    window_id: 1,
    test_start: '2024-01-08',
    test_end: '2024-01-14',
    metrics: {
      RMSE: 0.6,
      MAE: 0.35,
      MASE: 0.9,
      MAPE: 0.18,
    },
  },
  {
    window_id: 2,
    test_start: '2024-01-15',
    test_end: '2024-01-21',
    metrics: {
      RMSE: 0.45,
      MAE: 0.28,
      MASE: 0.75,
      MAPE: 0.12,
    },
  },
];

const mockHoldoutMetrics = {
  RMSE: 0.55,
  MAE: 0.32,
  MASE: 0.85,
  MAPE: 0.16,
};

describe('BacktestWindowChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastRenderedSeries = undefined;
  });

  describe('metric key normalization', () => {
    it('should handle evalMetric in snake_case format', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="mean_absolute_scaled_error"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      // Should normalize to MASE and show formatted name
      expect(screen.getByTestId('metric-selector-toggle')).toHaveTextContent('MASE');
    });

    it('should handle evalMetric already in acronym format', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      expect(screen.getByTestId('metric-selector-toggle')).toHaveTextContent('MASE');
    });

    it('should handle evalMetric that does not match any key', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="unknown_metric"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      // Should default to first metric key (RMSE)
      expect(screen.getByTestId('metric-selector-toggle')).toHaveTextContent('RMSE');
    });

    it('should handle evalMetric with mixed-case snake_case format', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="Mean_Absolute_Scaled_Error"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      // Should normalize to MASE despite mixed case
      expect(screen.getByTestId('metric-selector-toggle')).toHaveTextContent('MASE');
    });

    it('should correctly extract metric values when evalMetric is snake_case and data keys are acronyms', () => {
      // Reset captured series data
      lastRenderedSeries = undefined;

      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="mean_absolute_scaled_error"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      // Verify the series was rendered
      expect(lastRenderedSeries).toBeDefined();
      expect(lastRenderedSeries!.length).toBeGreaterThanOrEqual(3);

      // Get the window scatter series (scatter with multiple data points, not the holdout point)
      const windowScatterSeries = lastRenderedSeries!.find(
        (s) => s.type === 'scatter' && s.data.length > 1,
      );
      expect(windowScatterSeries).toBeDefined();
      expect(windowScatterSeries!.data).toHaveLength(3);

      // Verify each window's y value matches the actual MASE metric (not 0)
      // This tests that buildWindowData() correctly uses findMetricValue()
      // to map "mean_absolute_scaled_error" → "MASE" and extract the right values
      expect(windowScatterSeries!.data[0].y).toBe(0.8); // Window 0: MASE = 0.8
      expect(windowScatterSeries!.data[1].y).toBe(0.9); // Window 1: MASE = 0.9
      expect(windowScatterSeries!.data[2].y).toBe(0.75); // Window 2: MASE = 0.75

      // Verify the values are NOT zero
      windowScatterSeries!.data.forEach((point) => {
        expect(point.y).not.toBe(0);
      });
    });
  });

  describe('dropdown formatting', () => {
    it('should show formatted metric names in dropdown options', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      // Open dropdown
      fireEvent.click(screen.getByTestId('metric-selector-toggle'));

      // All options should show formatted names (acronyms are already formatted)
      // Verify each option exists as a menuitem
      expect(
        screen.getAllByRole('menuitem').some((item) => item.textContent.includes('RMSE')),
      ).toBe(true);
      expect(screen.getAllByRole('menuitem').some((item) => item.textContent.includes('MAE'))).toBe(
        true,
      );
      expect(
        screen.getAllByRole('menuitem').some((item) => item.textContent.includes('MASE')),
      ).toBe(true);
      expect(
        screen.getAllByRole('menuitem').some((item) => item.textContent.includes('MAPE')),
      ).toBe(true);
    });

    it('should show correct initial checkbox selection for snake_case evalMetric', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="mean_absolute_scaled_error"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      fireEvent.click(screen.getByTestId('metric-selector-toggle'));

      // MASE checkbox should be checked (normalized from mean_absolute_scaled_error)
      const maseOption = screen
        .getAllByRole('menuitem')
        .find((item) => item.textContent.includes('MASE')) as HTMLElement;
      expect(maseOption).toBeDefined();
      expect(maseOption.querySelector('input[type="checkbox"]')).toBeChecked();
    });
  });

  describe('single metric display', () => {
    it('should show formatted metric name in title for single selection', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="RMSE"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      expect(screen.getByText('RMSE by backtest window')).toBeInTheDocument();
    });

    it('should show metric description in tooltip', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="RMSE"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      const tooltip = screen.getByTestId('inline-tooltip');
      expect(tooltip).toHaveTextContent('RMSE');
      expect(tooltip).toHaveAttribute('title', expect.stringContaining('Root mean squared error'));
    });

    it('should render single chart when one metric is selected', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      const charts = screen.getAllByTestId('backtest-curve-chart');
      expect(charts).toHaveLength(1);
      expect(charts[0]).toHaveAttribute('aria-label', 'MASE by backtest window');
    });
  });

  describe('multi-metric display', () => {
    it('should show multiple charts when multiple metrics are selected', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
          initialSelectedMetrics={['RMSE', 'MAE', 'MASE']}
        />,
      );

      expect(screen.getByTestId('backtest-window-chart-grid')).toBeInTheDocument();
      expect(screen.getAllByTestId(/backtest-chart-card-/)).toHaveLength(3);
    });

    it('should show "Show all" in toggle when all metrics selected', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
          initialSelectedMetrics={['RMSE', 'MAE', 'MASE', 'MAPE']}
        />,
      );

      expect(screen.getByTestId('metric-selector-toggle')).toHaveTextContent('Show all');
    });

    it('should show metric count in toggle when partial selection', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
          initialSelectedMetrics={['RMSE', 'MAE']}
        />,
      );

      expect(screen.getByTestId('metric-selector-toggle')).toHaveTextContent('2 metrics');
    });
  });

  describe('metric selection behaviour', () => {
    it('should toggle metric selection when clicking option', () => {
      const onSelectedMetricsChange = jest.fn();
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
          onSelectedMetricsChange={onSelectedMetricsChange}
        />,
      );

      fireEvent.click(screen.getByTestId('metric-selector-toggle'));
      fireEvent.click(screen.getByText('RMSE'));

      expect(onSelectedMetricsChange).toHaveBeenCalledWith(['MASE', 'RMSE']);
    });

    it('should select all metrics when clicking "Show all"', () => {
      const onSelectedMetricsChange = jest.fn();
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
          onSelectedMetricsChange={onSelectedMetricsChange}
        />,
      );

      fireEvent.click(screen.getByTestId('metric-selector-toggle'));

      // Find and click the checkbox input for "Show all"
      const showAllOption = screen.getByTestId('metric-selector-show-all');
      const checkbox = showAllOption.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeInTheDocument();
      fireEvent.click(checkbox!);

      // Verify toggle text changes to "Show all" (component behaviour verification)
      expect(screen.getByTestId('metric-selector-toggle')).toHaveTextContent('Show all');

      // The callback should have been called with all metrics
      const { calls } = onSelectedMetricsChange.mock;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toEqual([['RMSE', 'MAE', 'MASE', 'MAPE']]);
    });

    it('should deselect all when unchecking last selected metric', () => {
      const onSelectedMetricsChange = jest.fn();
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
          onSelectedMetricsChange={onSelectedMetricsChange}
        />,
      );

      // Clear mount-time useEffect calls to isolate the deselect interaction
      onSelectedMetricsChange.mockClear();

      fireEvent.click(screen.getByTestId('metric-selector-toggle'));

      // Click the checkbox input for MASE (find the menuitem, then its checkbox)
      const maseMenuItem = screen
        .getAllByRole('menuitem')
        .find((item) => item.textContent.includes('MASE'));
      const checkbox = maseMenuItem!.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox!);

      // Should fall back to evalMetric when trying to deselect last metric
      expect(onSelectedMetricsChange).toHaveBeenCalledWith(['MASE']);
    });
  });

  describe('print mode', () => {
    it('should hide dropdown in print mode', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
          print
        />,
      );

      expect(screen.queryByTestId('metric-selector-toggle')).not.toBeInTheDocument();
    });

    it('should still render chart in print mode', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={mockPerWindowMetrics}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
          print
        />,
      );

      expect(screen.getByTestId('backtest-curve-chart')).toBeInTheDocument();
    });
  });

  describe('empty data handling', () => {
    it('should handle empty per-window metrics', () => {
      render(
        <BacktestWindowChart
          perWindowMetrics={[]}
          evalMetric="MASE"
          holdoutMetrics={mockHoldoutMetrics}
        />,
      );

      // Should still render without crashing
      expect(screen.getByTestId('metric-selector-toggle')).toBeInTheDocument();
    });
  });
});
