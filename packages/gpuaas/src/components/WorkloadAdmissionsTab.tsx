import * as React from 'react';
import { Charts } from '@patternfly/react-charts/echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { Alert, Content, Skeleton, getResizeObserver } from '@patternfly/react-core';
import {
  chart_global_FontFamily as chartGlobalFontFamily,
  chart_global_FontSize_sm as chartGlobalFontSizeSm,
  t_chart_color_blue_300 as chartBlue,
  t_chart_color_orange_300 as chartOrange,
} from '@patternfly/react-tokens';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';

import useWorkloadAdmissionMetrics, { getWindowConfig } from '../hooks/useWorkloadAdmissionMetrics';
import {
  ADMISSION_TIME_WINDOW_OPTIONS,
  buildAdmissionMetrics,
  formatAdmissionMetricHeadline,
  formatAdmissionTooltipTimestamp,
  formatAdmissionTimestamp,
  formatAdmissionMetricValue,
  getAdmissionMetricHeadlineValue,
  getAdmissionMetricsXDomain,
  getAdmissionMetricYBounds,
  getAdmissionMetricYInterval,
  getValidAdmissionMetricPoints,
  type AdmissionMetric,
} from '../utils/workloadAdmissions';

let echartsRegistered = false;

const getCSSVar = (name: string, fallback: string): string => {
  if (typeof document === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const getAdmissionChartTheme = (): Record<string, unknown> => ({
  textStyle: {
    fontFamily: getCSSVar(
      chartGlobalFontFamily.name,
      String(chartGlobalFontFamily.value).replace(/"/g, "'"),
    ),
    fontSize: chartGlobalFontSizeSm.value,
  },
});

type WorkloadAdmissionsTabProps = {
  metrics: ReturnType<typeof useWorkloadAdmissionMetrics>;
  timeWindow: string;
  onTimeWindowChange: (value: string) => void;
  canAccessAdminMetrics: boolean;
};

const ADMISSION_DAY_MS = 24 * 60 * 60 * 1000;

const AdmissionMetricChartComponent: React.FC<{
  metric: AdmissionMetric;
  xDomain: [number, number];
  animateOnMount: boolean;
  timeWindow: string;
}> = ({ metric, xDomain, animateOnMount, timeWindow }) => {
  if (!echartsRegistered) {
    echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer]);
    echartsRegistered = true;
  }

  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = React.useState(240);
  const theme = React.useMemo(() => getAdmissionChartTheme(), []);
  const data = getValidAdmissionMetricPoints(metric.data);
  const { yMin, yMax, yPadding } = getAdmissionMetricYBounds(data);
  const option = React.useMemo(() => {
    const yDomain: [number, number] = [Math.max(0, yMin - yPadding), yMax + yPadding];
    const dataDomain: [number, number] | undefined =
      data.length > 0 ? [data[0].x, data[data.length - 1].x] : undefined;
    const spansMultipleCalendarDays =
      dataDomain !== undefined &&
      new Date(dataDomain[0]).toDateString() !== new Date(dataDomain[1]).toDateString();
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
        ...(spansMultipleCalendarDays && { minInterval: ADMISSION_DAY_MS }),
        axisLine: { lineStyle: { color: 'var(--pf-t--global--border--color--default)' } },
        axisTick: { lineStyle: { color: 'var(--pf-t--global--border--color--default)' } },
        axisLabel: {
          color: 'var(--pf-t--global--text--color--subtle)',
          fontSize: 9,
          hideOverlap: true,
          formatter: (timestamp: number) =>
            formatAdmissionTimestamp(timestamp, timeWindow, dataDomain),
        },
        splitLine: {
          show: false,
          lineStyle: { type: 'dotted' as const },
        },
      },
      yAxis: {
        type: 'value' as const,
        min: yDomain[0],
        max: yDomain[1],
        splitNumber: 3,
        ...(getAdmissionMetricYInterval(metric.id, yMax) !== undefined && {
          interval: getAdmissionMetricYInterval(metric.id, yMax),
        }),
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
            type: 'dashed' as const,
            width: 1,
            opacity: 0.65,
          },
          show: true,
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
          const formattedValue = formatAdmissionMetricValue(metric.id, Number(value[1]));
          const tooltipValue =
            metric.id === 'waiting-workloads'
              ? `${formattedValue} waiting`
              : metric.id === 'active-workloads'
              ? `${formattedValue} active`
              : formattedValue;

          return `${formatAdmissionTooltipTimestamp(
            Number(value[0]),
            timeWindow,
          )}<br/>${tooltipValue}`;
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
    timeWindow,
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
      <Charts
        theme={theme}
        nodeSelector="html"
        height={140}
        width={chartWidth}
        option={option}
        isSvgRenderer
      />
    </div>
  );
};

const AdmissionMetricChart = React.memo(
  AdmissionMetricChartComponent,
  (previous, next) =>
    previous.metric.id === next.metric.id &&
    previous.metric.color === next.metric.color &&
    previous.metric.data === next.metric.data &&
    previous.xDomain[0] === next.xDomain[0] &&
    previous.xDomain[1] === next.xDomain[1] &&
    previous.animateOnMount === next.animateOnMount &&
    previous.timeWindow === next.timeWindow,
);

const AdmissionMetricChartLoading: React.FC<{ label: string }> = ({ label }) => (
  <div data-testid={`admission-metric-chart-loading-${label.toLowerCase().replaceAll(' ', '-')}`}>
    <Skeleton width="100%" height="140px" screenreaderText={`Loading ${label} chart`} />
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
    <div
      className="gpuaas-workload-overview__admission-metric"
      data-testid={`admission-metric-card-${metric.id}`}
    >
      {isLoading ? (
        <AdmissionMetricChartLoading label={metric.label} />
      ) : (
        <>
          <div data-testid={`admission-metric-value-${metric.id}`}>
            <Content component="h3" className="gpuaas-workload-overview__admission-value">
              {formattedValue}
            </Content>
          </div>
          <Content component="p">{metric.label}</Content>
        </>
      )}
      {!isLoading && (
        <AdmissionMetricChart
          key={`${metric.id}-${timeWindow}`}
          metric={metric}
          xDomain={xDomain}
          animateOnMount={animateOnMount}
          timeWindow={timeWindow}
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
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [timeWindowChangePending, setTimeWindowChangePending] = React.useState(false);
  const isInitialLoading = !hasLoadedOnce;
  const isSelectedWindowLoading =
    isInitialLoading ||
    metrics.loading ||
    timeWindowChangePending ||
    renderedTimeWindow.current !== timeWindow;
  const animateOnMount = !hasLoadedOnce && !timeWindowChangePending;

  React.useEffect(() => {
    if (!metrics.loading && (metrics.loaded || metrics.error)) {
      setHasLoadedOnce(true);
    }
    if (timeWindowChangePending && !metrics.loading) {
      renderedTimeWindow.current = timeWindow;
      setTimeWindowChangePending(false);
    }
  }, [metrics.error, metrics.loaded, metrics.loading, timeWindow, timeWindowChangePending]);

  const handleTimeWindowChange = (value: string) => {
    setTimeWindowChangePending(true);
    onTimeWindowChange(value);
  };

  const metricSeries = buildAdmissionMetrics(
    metrics,
    { blue: chartBlue.var, orange: chartOrange.var },
    canAccessAdminMetrics,
  );
  const xDomain = getAdmissionMetricsXDomain(getWindowConfig(timeWindow).span);

  return (
    <div
      className="gpuaas-workload-overview__admissions"
      data-testid="workload-overview-admissions"
    >
      {metrics.error && (
        <Alert
          variant="danger"
          isInline
          title="Unable to load admission metrics"
          className="gpuaas-workload-overview__admissions-error"
          data-testid="admission-metrics-error"
        >
          Some metrics could not be loaded. Refresh to try again.
        </Alert>
      )}
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
