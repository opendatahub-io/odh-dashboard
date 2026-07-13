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
import { formatMetricName, formatMetricValue, getMetricDescription } from '~/app/utilities/utils';

const FORECAST_LEGEND_ITEMS = [
  { color: COLOR_SCALE[0], label: 'Observed', opacity: 1 },
  { color: COLOR_SCALE[1], label: 'Forecast', opacity: 1 },
  { color: COLOR_SCALE[1], label: 'Confidence interval', opacity: 0.4 },
];

// Universally interpretable metrics shown as summary cards.
// RMSE/MAE are in target units; R2 is a unit-free goodness-of-fit score.
const SUMMARY_METRIC_KEYS = ['RMSE', 'MAE', 'R2'];

function findMetricEntry(
  data: Record<string, number>,
  key: string,
): { key: string; value: number } | undefined {
  const actualKey = Object.keys(data).find((k) => k.toLowerCase() === key.toLowerCase());
  return actualKey !== undefined ? { key: actualKey, value: data[actualKey] } : undefined;
}

const BacktestingTab: React.FC<TabContentProps> = ({ model, backTesting, isArtifactsLoading }) => {
  if (isArtifactsLoading) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label="Loading back-testing data" />
      </Bullseye>
    );
  }

  if (!backTesting) {
    return (
      <EmptyState
        data-testid="back-testing-no-data"
        variant={EmptyStateVariant.sm}
        icon={ChartLineIcon}
        titleText="Back-testing data unavailable"
        headingLevel="h4"
      >
        <EmptyStateBody>
          This data may be generated if the training run is submitted again.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const testData = model.metrics.test_data;

  // Show RMSE, MAE, R² as summary cards — universally interpretable metrics.
  // Fall back to the first 3 entries in test_data if none of the curated keys exist.
  const curatedMetrics = SUMMARY_METRIC_KEYS.map((k) => findMetricEntry(testData, k)).filter(
    (e): e is { key: string; value: number } => e !== undefined,
  );

  const overallMetrics =
    curatedMetrics.length > 0
      ? curatedMetrics
      : Object.entries(testData)
          .slice(0, 3)
          .map(([key, value]) => ({ key, value }));

  return (
    <div data-testid="back-testing-content">
      {/* Summary section */}
      <div className="automl-backtest-section">
        <Title headingLevel="h3" size="md">
          Summary
        </Title>
        <Content component={ContentVariants.p} className="pf-v6-u-mb-lg pf-v6-u-color-200">
          Aggregated across all backtest windows
        </Content>
        <Flex spaceItems={{ default: 'spaceItemsMd' }}>
          {overallMetrics.map(({ key, value }) => (
            <FlexItem key={key}>
              <div className="automl-backtest-metric-card">
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

      <Divider className="pf-v6-u-mt-xl pf-v6-u-mb-xl" />

      {/* Backtest window chart section */}
      <div className="automl-backtest-section">
        <div className="automl-backtest-window-chart-wrapper">
          <BacktestWindowChart
            perWindowMetrics={backTesting.per_window_metrics}
            evalMetric={backTesting.eval_metric}
            holdoutMetrics={testData}
          />
        </div>
      </div>

      <Divider className="pf-v6-u-mt-xl pf-v6-u-mb-xl" />

      {/* Forecast vs. observed section */}
      <div className="automl-backtest-section">
        <Title headingLevel="h3" size="md">
          Forecast vs. observed
        </Title>
        <Content component={ContentVariants.p} className="pf-v6-u-mb-lg pf-v6-u-color-200">
          Charts show historical observed values and the forecast with confidence interval.
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
          className="pf-v6-u-mt-lg"
        >
          {FORECAST_LEGEND_ITEMS.map(({ color, label, opacity }) => (
            <FlexItem key={label}>
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <svg width="20" height="4">
                    <rect width="20" height="4" fill={color} opacity={opacity} rx="1" />
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
