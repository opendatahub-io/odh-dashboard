import { ChartThemeColor, getTheme } from '@patternfly/react-charts/victory';
import { chart_color_black_300 as chartColorGray } from '@patternfly/react-tokens';
import { CQMetricSeries } from '../hooks/useBorrowingLendingMetrics';
import {
  CURSOR_GAP,
  FLYOUT_MAX_WIDTH,
  LEGEND_MAX_CHARS,
  TOOLTIP_PANEL_TOTAL_HEIGHT,
} from '../const';

export type TooltipPoint = {
  childName?: string;
  x: number;
  y: number;
  nominalQuota?: number;
};

/**
 * Pull the color scale directly from PF's Victory theme so tooltip dots
 * always match chart line colors — including dark/high-contrast variants.
 */
export const CHART_COLOR_SCALE: string[] = (() => {
  const scale = getTheme(ChartThemeColor.multiOrdered).chart?.colorScale;
  return Array.isArray(scale) ? scale.map(String) : [];
})();

/** "Tue 30 Jun" — x-axis label format matching the UX design */
export const formatXTick = (x: number): string => {
  const d = new Date(x);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday} ${day} ${month}`;
};

/** "Fri 3 Jul, 01:00 GMT+5:30" — full timestamp with timezone for tooltip headers */
export const formatTooltipDate = (x: number): string => {
  const d = new Date(x);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
  return `${weekday} ${day} ${month}, ${time}`;
};

/** Signed values: "+2", "0", "-3" so positive = borrowing, negative = lending */
export const formatYTick = (y: number): string => {
  if (y === 0) {
    return '0';
  }
  const abs = Math.abs(y);
  const val = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : String(Math.round(abs));
  return y > 0 ? `+${val}` : `-${val}`;
};

/**
 * Truncate a string to maxChars, appending "…" if it exceeds the limit.
 * Used for SVG legend labels where CSS text-overflow is unavailable.
 */
export const truncateLabel = (label: string, maxChars = LEGEND_MAX_CHARS): string =>
  label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;

/** Cohort-prefixed label for a series — used in both tooltips and the legend. */
export const getEntryLabel = (info: CQMetricSeries | undefined, fallback: string): string => {
  if (!info) {
    return fallback;
  }
  return info.cohortName ? `${info.cohortName} · ${info.cqName}` : info.cqName;
};

/** Truncated legend label for the SVG legend column (CSS text-overflow is unavailable in SVG). */
export const getLegendLabel = (s: CQMetricSeries): string =>
  truncateLabel(getEntryLabel(s, s.cqName));

/**
 * Compute the Y-axis domain from all series data, always including zero.
 * A fixed ±1 buffer is added so peak data points never sit on the chart boundary,
 * which would cause the Voronoi container to miss hover events at those extremes.
 */
export const buildYDomain = (series: CQMetricSeries[]): { minY: number; maxY: number } => {
  const allY = series.flatMap((s) => s.data.map((d) => d.y));
  const rawMin = allY.reduce((min, y) => Math.min(min, y), 0);
  const rawMax = allY.reduce((max, y) => Math.max(max, y), 0);
  return { minY: rawMin - 1, maxY: rawMax + 1 };
};

/**
 * Compute explicit Y-axis tick values that always include 0.
 * Uses a step size derived from the domain range so ticks are evenly spaced
 * and land on whole numbers (GPU quota values are always integers).
 */
export const getYAxisTicks = (minY: number, maxY: number): number[] => {
  const range = maxY - minY;
  const step = Math.max(1, Math.ceil(range / 8));
  const ticks: number[] = [];
  for (let t = Math.ceil(minY / step) * step; t <= maxY; t += step) {
    ticks.push(t);
  }
  return ticks;
};

/**
 * Build a cqName → color map keyed to the *visible* render order so tooltip
 * dots match chart line colors even when series are toggled.
 */
export const buildColorByName = (
  series: CQMetricSeries[],
  hiddenSeries: Set<string>,
): Map<string, string> =>
  new Map(
    series
      .filter((s) => !hiddenSeries.has(s.cqName))
      .map((s, i) => [
        s.cqName,
        CHART_COLOR_SCALE.length > 0
          ? CHART_COLOR_SCALE[i % CHART_COLOR_SCALE.length]
          : chartColorGray.value,
      ]),
  );

/** Build the legend data array, greying out hidden series symbols. */
export const buildLegendData = (
  series: CQMetricSeries[],
  hiddenSeries: Set<string>,
): {
  name: string;
  fullName: string;
  childName: string;
  symbol: { type: string; fill?: string };
}[] =>
  series.map((s) => ({
    name: getLegendLabel(s),
    fullName: getEntryLabel(s, s.cqName),
    childName: s.cqName,
    symbol: hiddenSeries.has(s.cqName)
      ? { type: 'circle', fill: 'var(--pf-t--global--text--color--disabled)' }
      : { type: 'circle' },
  }));

/**
 * Build Victory legend event handlers that toggle a series on click.
 * Victory's event system is untyped; the eslint-disable is intentional.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildLegendEvents = (toggleSeries: (name: string) => void): any[] => {
  const onClick = (_evt: unknown, props: { datum: { childName?: string } }) => {
    if (props.datum.childName) {
      toggleSeries(props.datum.childName);
    }
    return null;
  };
  const onMouseOver = () => [{ mutation: () => ({ style: { cursor: 'pointer' } }) }];
  const onMouseOut = () => [{ mutation: () => null }];
  return [
    { target: 'data', eventHandlers: { onClick, onMouseOver, onMouseOut } },
    { target: 'labels', eventHandlers: { onClick, onMouseOver, onMouseOut } },
  ];
};

/**
 * Convert Victory's SVG-local cursor coordinates into a viewport-relative
 * tooltip position, flipping left/right to stay within the window bounds.
 */
export const getTooltipPosition = (
  containerRef: { current: HTMLDivElement | null } | undefined,
  x: number,
  y: number,
): { finalLeft: number; finalTop: number } => {
  const svgRect = containerRef?.current?.getBoundingClientRect();
  const vpX = (svgRect?.left ?? 0) + x;
  const vpY = (svgRect?.top ?? 0) + y;
  const fitsRight = vpX + CURSOR_GAP + FLYOUT_MAX_WIDTH <= window.innerWidth;
  const fitsBelow = vpY - 60 + TOOLTIP_PANEL_TOTAL_HEIGHT + 8 <= window.innerHeight;
  return {
    finalLeft: fitsRight ? vpX + CURSOR_GAP : vpX - CURSOR_GAP - FLYOUT_MAX_WIDTH,
    finalTop: fitsBelow ? Math.max(8, vpY - 60) : Math.max(8, vpY - TOOLTIP_PANEL_TOTAL_HEIGHT),
  };
};
