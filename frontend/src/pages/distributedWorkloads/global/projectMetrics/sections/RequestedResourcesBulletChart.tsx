import * as React from 'react';
import { capitalize } from '@patternfly/react-core';
import { ChartBullet, ChartLegend } from '@patternfly/react-charts/victory';
import {
  chart_color_blue_300 as chartColorBlue300,
  chart_color_blue_100 as chartColorBlue100,
  chart_color_black_100 as chartColorBlack100,
  chart_color_orange_300 as chartColorOrange300,
} from '@patternfly/react-tokens';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { roundNumber } from '~/utilities/number';

type RequestedResourcesBulletChartProps = {
  metricLabel: string;
  unitLabel: string;
  numRequestedByThisProject: number;
  numRequestedByAllProjects: number;
  numTotalSharedQuota: number;
};
export const RequestedResourcesBulletChart: React.FC<RequestedResourcesBulletChartProps> = ({
  metricLabel,
  unitLabel,
  numRequestedByThisProject,
  numRequestedByAllProjects,
  numTotalSharedQuota,
}) => {
  const { projectDisplayName } = React.useContext(DistributedWorkloadsContext);
  const [width, setWidth] = React.useState(250);
  const chartHeight = 250;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const updateWidth = () => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth);
    }
  };
  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Cap things at 110% total quota for display, but show real values in tooltips
  const maxDomain = numTotalSharedQuota * 1.1;
  // Warn at 150% total quota
  const warningThreshold = numTotalSharedQuota * 1.5;

  type CappedBulletChartDataItem = {
    name: string;
    color: string;
    tooltip?: string; // Falls back to `name: preciseValue` if omitted
    hideValueInLegend?: boolean;
    preciseValue: number;
    legendValue: number;
    tooltipValue: number;
    cappedValue: number;
  };
  const getDataItem = (
    args: Omit<CappedBulletChartDataItem, 'legendValue' | 'tooltipValue' | 'cappedValue'>,
  ): CappedBulletChartDataItem => ({
    ...args,
    legendValue: roundNumber(args.preciseValue),
    tooltipValue: roundNumber(args.preciseValue, 3),
    cappedValue: roundNumber(Math.min(args.preciseValue, maxDomain)),
  });

  const requestedByThisProjectData = getDataItem({
    name: `Requested by ${projectDisplayName}`,
    color: chartColorBlue300.value,
    preciseValue: numRequestedByThisProject,
  });
  const requestedByAllProjectsData = getDataItem({
    name: 'Requested by all projects',
    color: chartColorBlue100.value,
    preciseValue: numRequestedByAllProjects,
  });
  const totalSharedQuotaData = getDataItem({
    name: 'Total shared quota',
    color: chartColorBlack100.value,
    preciseValue: numTotalSharedQuota,
  });
  const warningThresholdData = getDataItem({
    name: 'Warning threshold (over 150%)',
    color: chartColorOrange300.value,
    tooltip: 'Requested resources have surpassed 150%',
    hideValueInLegend: true,
    preciseValue: warningThreshold,
  });

  const segmentedMeasureData = [requestedByThisProjectData, requestedByAllProjectsData];
  const qualitativeRangeData = [totalSharedQuotaData];

  const hasWarning = segmentedMeasureData.some(
    ({ preciseValue }) => preciseValue > warningThreshold,
  );
  const warningMeasureData = hasWarning ? [warningThresholdData] : [];

  const allData = [...segmentedMeasureData, ...qualitativeRangeData, ...warningMeasureData];
  return (
    <div ref={containerRef} style={{ height: `${chartHeight}px` }}>
      <svg viewBox={`0 0 ${width} ${chartHeight}`} preserveAspectRatio="none" width="100%">
        <ChartBullet
          standalone={false}
          title={metricLabel}
          subTitle={capitalize(unitLabel)}
          ariaTitle={`Requested ${metricLabel} ${unitLabel}`}
          ariaDesc="Bullet chart"
          name={`requested-resources-chart-${metricLabel}`}
          labels={({ datum }) => {
            const matchingDataItem = allData.find(({ name }) => name === datum.name);
            const { tooltip, name, tooltipValue } = matchingDataItem || {};
            return tooltip || `${name ?? ''}: ${tooltipValue ?? ''} ${unitLabel}`;
          }}
          primarySegmentedMeasureData={segmentedMeasureData.map(({ name, cappedValue }) => ({
            name,
            y: cappedValue,
          }))}
          qualitativeRangeData={qualitativeRangeData.map(({ name, cappedValue }) => ({
            name,
            y: cappedValue,
          }))}
          comparativeWarningMeasureData={warningMeasureData.map(({ name, cappedValue }) => ({
            name,
            y: cappedValue,
          }))}
          maxDomain={{ y: roundNumber(maxDomain) }}
          titlePosition="top-left"
          legendPosition="bottom-left"
          legendOrientation="vertical"
          legendComponent={
            <ChartLegend
              data={allData.map(({ name, hideValueInLegend, legendValue }) => ({
                name: hideValueInLegend ? name : `${name}: ${legendValue}`,
              }))}
              colorScale={allData.map(({ color }) => color)}
              gutter={30}
              itemsPerRow={3}
              rowGutter={0}
            />
          }
          constrainToVisibleArea
          width={width}
          padding={{
            bottom: 100, // Adjusted to accommodate legend
            left: 50,
            right: 50,
            top: 100, // Adjusted to accommodate labels
          }}
        />
      </svg>
    </div>
  );
};
