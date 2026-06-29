import React from 'react';
import { Bullseye, Flex, FlexItem, Grid, GridItem, Spinner, Title } from '@patternfly/react-core';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import BacktestWindowChart from '~/app/components/run-results/AutomlModelDetailsModal/components/BacktestWindowChart';
import ForecastChart from '~/app/components/run-results/AutomlModelDetailsModal/components/ForecastChart';
import { COLOR_SCALE } from '~/app/components/run-results/AutomlModelDetailsModal/components/chartConstants';
import { formatMetricName, formatMetricValue } from '~/app/utilities/utils';

const FORECAST_LEGEND_ITEMS = [
  { color: COLOR_SCALE[0], label: 'Observed' },
  { color: COLOR_SCALE[1], label: 'Forecast' },
  { color: COLOR_SCALE[1], label: 'Confidence interval', opacity: 0.4 },
];

const MAX_METRIC_CARDS = 3;

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
      <p data-testid="back-testing-no-data">
        Back-testing data is not available for this model. This data is generated when the training
        run is submitted with AutoGluon 3.5 or later. Try resubmitting the run.
      </p>
    );
  }

  const overallMetrics = Object.entries(model.metrics.test_data).slice(0, MAX_METRIC_CARDS);

  return (
    <div data-testid="back-testing-content">
      <Flex spaceItems={{ default: 'spaceItemsMd' }} className="pf-v6-u-mb-lg">
        {overallMetrics.map(([key, value]) => (
          <FlexItem key={key}>
            <div className="automl-backtest-metric-card">
              <span className="automl-backtest-metric-card__label">
                {`Overall ${formatMetricName(key)}`}
              </span>
              <span className="automl-backtest-metric-card__value">{formatMetricValue(value)}</span>
            </div>
          </FlexItem>
        ))}
      </Flex>

      <div className="automl-backtest-window-chart-wrapper">
        {/* eslint-disable-next-line camelcase */}
        <BacktestWindowChart
          perWindowMetrics={backTesting.per_window_metrics}
          evalMetric={backTesting.eval_metric}
        />
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <svg width="10" height="10">
              <circle cx="5" cy="5" r="4" fill={COLOR_SCALE[0]} />
            </svg>
          </FlexItem>
          <FlexItem>Backtest windows</FlexItem>
        </Flex>
      </div>

      <Title headingLevel="h3" size="md" className="pf-v6-u-mt-lg pf-v6-u-mb-md">
        Forecast vs. observed
      </Title>
      <Grid hasGutter>
        <GridItem span={6}>
          <ForecastChart performer={backTesting.series_analysis.best_performer} title="best fit" />
        </GridItem>
        <GridItem span={6}>
          <ForecastChart
            performer={backTesting.series_analysis.worst_performer}
            title="worst fit"
          />
        </GridItem>
      </Grid>
      <Flex spaceItems={{ default: 'spaceItemsMd' }} className="pf-v6-u-mt-sm">
        {FORECAST_LEGEND_ITEMS.map(({ color, label, opacity }) => (
          <FlexItem key={label}>
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <svg width="20" height="4">
                  <rect width="20" height="4" fill={color} opacity={opacity ?? 1} />
                </svg>
              </FlexItem>
              <FlexItem>{label}</FlexItem>
            </Flex>
          </FlexItem>
        ))}
      </Flex>
    </div>
  );
};

export default BacktestingTab;
