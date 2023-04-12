import React from 'react';
import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import _ from 'lodash';
import MetricsChart, { DomainCalculator } from '~/pages/modelServing/screens/metrics/MetricsChart';
import ScheduledMetricSelect, {
  TrustyMetaData,
} from '~/pages/modelServing/screens/metrics/ScheduledMetricSelect';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';

type TrustyChartProps = {
  title: string;
  abbreviation: string;
  trustyMetricType: InferenceMetricType;
  tooltip: React.ReactNode;
  threshold?: number;
  minThreshold?: number;
  //TODO: Consider a different parameter name
  domainCalc: DomainCalculator;
};

const TrustyChart: React.FC<TrustyChartProps> = ({
  title,
  abbreviation,
  trustyMetricType,
  tooltip,
  threshold,
  minThreshold,
  domainCalc,
}) => {
  const { data } = React.useContext(ModelServingMetricsContext);
  const metric = {
    ...data[trustyMetricType],
    data: data[trustyMetricType].data[0]?.values,
  };

  const fullPayload = data[trustyMetricType].data;
  const metadata: TrustyMetaData[] = fullPayload.map((payload) => ({
    protectedAttribute: payload.metric.protected,
    protectedValue: payload.metric.privileged,
    favorableOutput: payload.metric.outcome,
    favorableValue: payload.metric.favorable_value,
  }));

  const metadataSet: TrustyMetaData[] = _.uniqWith(metadata, _.isEqual);

  return (
    <MetricsChart
      title={`${title} (${abbreviation})`}
      metrics={{
        name: abbreviation,
        metric: metric,
      }}
      domain={domainCalc}
      toolbar={
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>{tooltip}</ToolbarItem>
            <ToolbarItem variant="label">Scheduled Metric</ToolbarItem>
            <ToolbarItem>
              <ScheduledMetricSelect metadata={metadataSet} />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      }
      threshold={threshold}
      minThreshold={minThreshold}
      thresholdColor="red"
    />
  );
};
export default TrustyChart;
