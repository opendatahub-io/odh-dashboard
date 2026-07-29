import React from 'react';
import {
  Bullseye,
  Content,
  ContentVariants,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Popover,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ChartLineIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import BacktestWindowChart from '~/app/components/run-results/AutomlModelDetailsModal/components/BacktestWindowChart';
import ForecastChart from '~/app/components/run-results/AutomlModelDetailsModal/components/ForecastChart';
import { COLOR_SCALE } from '~/app/components/run-results/AutomlModelDetailsModal/components/chartConstants';
import {
  findMetricValue,
  formatMetricName,
  formatMetricValue,
  getMetricDescription,
} from '~/app/utilities/utils';

const FORECAST_LEGEND_ITEMS = [
  { color: COLOR_SCALE[1], label: 'Observed', opacity: 1 },
  { color: COLOR_SCALE[3], label: 'Forecast', opacity: 1 },
  { color: COLOR_SCALE[0], label: 'Confidence interval', opacity: 0.4 },
];

const SUMMARY_METRIC_KEYS = ['RMSE', 'MAE', 'MAPE'];

const BacktestingTab: React.FC<TabContentProps> = ({
  print,
  model,
  backTesting,
  isArtifactsLoading,
  backtestSelectedMetrics,
  onBacktestMetricsChange,
}) => {
  const windowMetricMeans = React.useMemo(() => {
    const windows = backTesting?.per_window_metrics;
    if (!windows || windows.length === 0) {
      return {};
    }
    const keys = Object.keys(windows[0].metrics);
    return Object.fromEntries(
      keys.map((k) => {
        const sum = windows.reduce((acc, w) => acc + (w.metrics[k] ?? 0), 0);
        return [k, sum / windows.length];
      }),
    );
  }, [backTesting?.per_window_metrics]);

  if (isArtifactsLoading) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label="Loading backtest window data" />
      </Bullseye>
    );
  }

  if (!backTesting) {
    return (
      <EmptyState
        data-testid="backtest-window-no-data"
        variant={EmptyStateVariant.sm}
        icon={ChartLineIcon}
        titleText="Backtest window data unavailable"
        headingLevel="h4"
      >
        <EmptyStateBody>
          This data may be generated if the training run is submitted again.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const testData = model.metrics.test_data;

  // Prefer RMSE, MAE, MAPE (universally interpretable); fill remaining slots
  // from other available window metrics to always show 3 cards.
  const curatedMetrics = SUMMARY_METRIC_KEYS.map((k) =>
    findMetricValue(windowMetricMeans, k),
  ).filter((e): e is { key: string; value: number } => e !== undefined);

  const curatedKeys = new Set(curatedMetrics.map((m) => m.key));
  const remaining = Object.entries(windowMetricMeans)
    .filter(([key]) => !curatedKeys.has(key))
    .slice(0, 3 - curatedMetrics.length)
    .map(([key, value]) => ({ key, value }));

  const overallMetrics = [...curatedMetrics, ...remaining];

  return (
    <div data-testid="backtest-window-content">
      {/* Summary section */}
      <div className="automl-backtest-section">
        <Title headingLevel="h3" size="md" className="pf-v6-u-mb-sm">
          Summary
        </Title>
        <Content component={ContentVariants.p} className="pf-v6-u-mb-lg pf-v6-u-color-200">
          Average error metrics computed across all rolling validation windows. Lower values
          indicate better forecast accuracy.
        </Content>
        <Flex spaceItems={{ default: 'spaceItemsMd' }}>
          {overallMetrics.map(({ key, value }) => (
            <FlexItem key={key}>
              <div className="automl-backtest-metric-card" data-testid={`metric-card-${key}`}>
                <span className="automl-backtest-metric-card__label">
                  {`Overall ${formatMetricName(key)}`}
                  <Popover bodyContent={getMetricDescription(key)} position="top">
                    <DashboardPopupIconButton
                      aria-label={`More info for ${formatMetricName(key)}`}
                      icon={<OutlinedQuestionCircleIcon />}
                      hasNoPadding
                    />
                  </Popover>
                </span>
                <span className="automl-backtest-metric-card__value">
                  {formatMetricValue(value)}
                </span>
              </div>
            </FlexItem>
          ))}
        </Flex>
      </div>

      <Divider className="pf-v6-u-mt-3xl pf-v6-u-mb-3xl" />

      {/* Backtest window chart section */}
      <div className="automl-backtest-section">
        <BacktestWindowChart
          perWindowMetrics={backTesting.per_window_metrics}
          evalMetric={backTesting.eval_metric}
          holdoutMetrics={testData}
          print={print}
          initialSelectedMetrics={backtestSelectedMetrics}
          onSelectedMetricsChange={onBacktestMetricsChange}
        />
      </div>

      <Divider className="pf-v6-u-mt-3xl pf-v6-u-mb-3xl" />

      {/* Forecast vs. observed section */}
      <div className="automl-backtest-section">
        <Title headingLevel="h3" size="md" className="pf-v6-u-mb-sm">
          Forecast vs. observed
        </Title>
        <Content component={ContentVariants.p} className="pf-v6-u-mb-lg pf-v6-u-color-200">
          Comparing actual values (observed) against model predictions (forecast) for the best and
          worst performing series. The shaded area shows the confidence interval. A narrower band
          indicates higher prediction confidence.
        </Content>
        <Grid hasGutter>
          <GridItem span={6}>
            <ForecastChart
              performer={backTesting.series_analysis.best_performer}
              title="Best fit"
            />
          </GridItem>
          <GridItem span={6}>
            <ForecastChart
              performer={backTesting.series_analysis.worst_performer}
              title="Worst fit"
            />
          </GridItem>
        </Grid>
        <Flex
          spaceItems={{ default: 'spaceItemsMd' }}
          justifyContent={{ default: 'justifyContentCenter' }}
          className="pf-v6-u-mt-lg pf-v6-u-mb-2xl"
        >
          {FORECAST_LEGEND_ITEMS.map(({ color, label, opacity }) => (
            <FlexItem key={label}>
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <svg width="20" height="14" style={{ display: 'block' }}>
                    <rect y="5" width="20" height="4" fill={color} opacity={opacity} rx="1" />
                  </svg>
                </FlexItem>
                <FlexItem>{label}</FlexItem>
              </Flex>
            </FlexItem>
          ))}
        </Flex>
      </div>
    </div>
  );
};

export default BacktestingTab;
