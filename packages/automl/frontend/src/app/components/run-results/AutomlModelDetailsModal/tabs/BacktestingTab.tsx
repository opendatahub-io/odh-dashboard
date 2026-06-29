import React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import BacktestWindowChart from '~/app/components/run-results/AutomlModelDetailsModal/components/BacktestWindowChart';
import ForecastChart from '~/app/components/run-results/AutomlModelDetailsModal/components/ForecastChart';

const BacktestingTab: React.FC<TabContentProps> = ({ backTesting, isArtifactsLoading }) => {
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

  return (
    <div data-testid="back-testing-content">
      {/* eslint-disable-next-line camelcase */}
      <BacktestWindowChart
        perWindowMetrics={backTesting.per_window_metrics}
        evalMetric={backTesting.eval_metric}
      />
      <ForecastChart
        performer={backTesting.series_analysis.best_performer}
        title="best fit"
        data-testid="forecast-chart-best"
      />
      <ForecastChart
        performer={backTesting.series_analysis.worst_performer}
        title="worst fit"
        data-testid="forecast-chart-worst"
      />
    </div>
  );
};

export default BacktestingTab;
