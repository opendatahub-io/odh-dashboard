import * as React from 'react';
import { Charts } from '@patternfly/react-charts/echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { Content, Skeleton, getResizeObserver } from '@patternfly/react-core';
import {
  t_chart_color_blue_300 as chartBlue,
  t_chart_color_orange_300 as chartOrange,
} from '@patternfly/react-tokens';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';

import useWorkloadAdmissionMetrics from '../hooks/useWorkloadAdmissionMetrics';
import {
  ADMISSION_TIME_WINDOW_OPTIONS,
  buildAdmissionMetrics,
  formatAdmissionMetricHeadline,
  formatAdmissionMetricValue,
  getAdmissionMetricHeadlineValue,
  getAdmissionMetricsXDomain,
  getAdmissionMetricYBounds,
  getValidAdmissionMetricPoints,
  type AdmissionMetric,
} from '../utils/workloadAdmissions';

type WorkloadAdmissionsTabProps = {
  metrics: ReturnType<typeof useWorkloadAdmissionMetrics>;
  timeWindow: string;
  onTimeWindowChange: (value: string) => void;
  canAccessAdminMetrics: boolean;
};

let admissionChartsRegistered = false;

const AdmissionMetricChartComponent: React.FC<{
  metric: AdmissionMetric;
  xDomain: [number, number];
  animateOnMount: boolean;
}> = ({ metric, xDomain, animateOnMount }) => {
  if (!admissionChartsRegistered) {
    echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer]);
    admissionChartsRegistered = true;
  }

  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = React.useState(240);
  const data = getValidAdmissionMetricPoints(metric.data);
  const { yMin, yMax, yPadding } = getAdmissionMetricYBounds(data);
  const option = React.useMemo(() => {
    const yDomain: [number, number] = [Math.max(0, yMin - yPadding), yMax + yPadding];
    return {
      animation: animateOnMount,
      animationDuration: animateOnMount ? 1200 : 0,
      animationEasing: animateOnMount ? ('cubicOut' as const) : undefined,
      animationDurationUpdate: 0,
      grid: { left: 48, right: 8, top: 8, bottom: 28 },
      xAxis: {
        type: 'time' as const,
        min: xDomain[0],
        max: xDomain[1],
        axisLine: { lineStyle: { color: 'var(--pf-t--global--border--color--default)' } },
        axisTick: { lineStyle: { color: 'var(--pf-t--global--border--color--default)' } },
        axisLabel: {
          color: 'var(--pf-t--global--text--color--subtle)',
          fontSize: 9,
          hideOverlap: true,
          formatter: (timestamp: number) =>
            new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        min: yDomain[0],
        max: yDomain[1],
        splitNumber: 3,
        axisLine: { lineStyle: { color: 'var(--pf-t--global--border--color--default)' } },
        axisTick: { lineStyle: { color: 'var(--pf-t--global--border--color--default)' } },
        axisLabel: {
          color: 'var(--pf-t--global--text--color--subtle)',
          fontSize: 9,
          formatter: (value: number) => formatAdmissionMetricValue(metric.id, value),
        },
        splitLine: {
          lineStyle: {
            color: 'var(--pf-t--global--border--color--default)',
            type: 'dotted' as const,
            opacity: 0.65,
          },
        },
      },
      tooltip: {
        trigger: 'axis' as const,
        confine: true,
        position: 'top' as const,
        axisPointer: { type: 'line' as const },
        formatter: (params: unknown) => {
          const point = Array.isArray(params) ? params[0] : params;
          if (!point || typeof point !== 'object' || !('value' in point)) {
            return '';
          }
          const { value } = point;
          if (!Array.isArray(value) || value.length < 2) {
            return '';
          }
          return `${new Date(Number(value[0])).toLocaleString()}<br/>${
            metric.label
          }: ${formatAdmissionMetricValue(metric.id, Number(value[1]))}`;
        },
      },
      series: [
        {
          type: 'line' as const,
          data: data.map((point) => [point.x, point.y]),
          showSymbol: false,
          smooth: metric.interpolation !== 'stepAfter',
          step: metric.interpolation === 'stepAfter' ? ('end' as const) : undefined,
          lineStyle: { color: metric.color, width: 2 },
          itemStyle: { color: metric.color },
          areaStyle: { color: metric.color, opacity: 0.25 },
          emphasis: { disabled: true },
        },
      ],
    };
  }, [
    data,
    animateOnMount,
    metric.color,
    metric.id,
    metric.interpolation,
    metric.label,
    xDomain,
    yMin,
    yMax,
    yPadding,
  ]);

  React.useEffect(() => {
    const element = chartContainerRef.current;
    if (!element) {
      return undefined;
    }
    const handleResize = () => {
      if (element.clientWidth > 0) {
        setChartWidth(element.clientWidth);
      }
    };
    const cleanup = getResizeObserver(element, handleResize);
    handleResize();
    return cleanup;
  }, []);

  return (
    <div ref={chartContainerRef} className="gpuaas-workload-overview__admission-chart">
      <Charts height={140} width={chartWidth} option={option} isSvgRenderer />
    </div>
  );
};

const AdmissionMetricChart = React.memo(
  AdmissionMetricChartComponent,
  (previous, next) =>
    previous.metric.id === next.metric.id &&
    previous.metric.color === next.metric.color &&
    previous.animateOnMount === next.animateOnMount,
);

const AdmissionMetricChartLoading: React.FC<{ label: string }> = ({ label }) => (
  <Skeleton width="100%" height="140px" screenreaderText={`Loading ${label} chart`} />
);

const AdmissionMetricHeaderLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="gpuaas-workload-overview__admission-header-loading">
    <Skeleton width="80px" height="24px" screenreaderText={`Loading ${label} value`} />
    <Skeleton width="120px" height="16px" screenreaderText={`Loading ${label} label`} />
  </div>
);

const AdmissionMetricCard: React.FC<{
  metric: AdmissionMetric;
  xDomain: [number, number];
  isLoading: boolean;
  animateOnMount: boolean;
  timeWindow: string;
}> = ({ metric, xDomain, isLoading, animateOnMount, timeWindow }) => {
  const formattedValue = formatAdmissionMetricHeadline(
    metric,
    getAdmissionMetricHeadlineValue(metric),
  );

  return (
    <div className="gpuaas-workload-overview__admission-metric">
      {isLoading ? (
        <AdmissionMetricHeaderLoading label={metric.label} />
      ) : (
        <>
          <Content component="h3" className="gpuaas-workload-overview__admission-value">
            {formattedValue}
          </Content>
          <Content component="p">{metric.label}</Content>
        </>
      )}
      {isLoading ? (
        <AdmissionMetricChartLoading label={metric.label} />
      ) : (
        <AdmissionMetricChart
          key={`${metric.id}-${timeWindow}`}
          metric={metric}
          xDomain={xDomain}
          animateOnMount={animateOnMount}
        />
      )}
    </div>
  );
};

const WorkloadAdmissionsTab: React.FC<WorkloadAdmissionsTabProps> = ({
  metrics,
  timeWindow,
  onTimeWindowChange,
  canAccessAdminMetrics,
}) => {
  const renderedTimeWindow = React.useRef(timeWindow);
  const hasLoadedOnce = React.useRef(false);
  const [timeWindowChangePending, setTimeWindowChangePending] = React.useState(false);
  const isInitialLoading = !hasLoadedOnce.current && !metrics.loaded;
  const isSelectedWindowLoading =
    isInitialLoading || timeWindowChangePending || renderedTimeWindow.current !== timeWindow;
  const animateOnMount = !hasLoadedOnce.current && !timeWindowChangePending;

  React.useEffect(() => {
    if (metrics.loaded) {
      hasLoadedOnce.current = true;
    }
    if (timeWindowChangePending && !metrics.loading) {
      renderedTimeWindow.current = timeWindow;
      setTimeWindowChangePending(false);
    }
  }, [metrics.loaded, metrics.loading, timeWindow, timeWindowChangePending]);

  const handleTimeWindowChange = (value: string) => {
    setTimeWindowChangePending(true);
    onTimeWindowChange(value);
  };

  const metricSeries = buildAdmissionMetrics(
    metrics,
    { blue: chartBlue.var, orange: chartOrange.var },
    canAccessAdminMetrics,
  );
  const xDomain = getAdmissionMetricsXDomain(metricSeries);

  return (
    <div
      className="gpuaas-workload-overview__admissions"
      data-testid="workload-overview-admissions"
    >
      <div className="gpuaas-workload-overview__admissions-window">
        <SimpleSelect
          options={ADMISSION_TIME_WINDOW_OPTIONS}
          value={timeWindow}
          onChange={handleTimeWindowChange}
          ariaLabel="Admission time window"
          dataTestId="admission-time-window"
          toggleProps={{ className: 'gpuaas-workload-overview__admission-time-window-toggle' }}
          popperProps={{ maxWidth: undefined }}
        />
      </div>
      <div
        className={`gpuaas-workload-overview__admission-metrics ${
          canAccessAdminMetrics ? '' : 'gpuaas-workload-overview__admission-metrics--two'
        }`}
        data-testid="admission-metric-charts"
      >
        {metricSeries.map((metric) => (
          <AdmissionMetricCard
            key={metric.id}
            metric={metric}
            xDomain={xDomain}
            isLoading={isSelectedWindowLoading}
            animateOnMount={animateOnMount}
            timeWindow={timeWindow}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkloadAdmissionsTab;
