import { dynamicImportPluginLoader } from '@perses-dev/plugin-system';

import * as barchartPlugin from '@perses-dev/bar-chart-plugin';
import * as datasourceVariablePlugin from '@perses-dev/datasource-variable-plugin';
import * as flameChartPlugin from '@perses-dev/flame-chart-plugin';
import * as gaugeChartPlugin from '@perses-dev/gauge-chart-plugin';
import * as heatmapChartPlugin from '@perses-dev/heatmap-chart-plugin';
import * as histogramChartPlugin from '@perses-dev/histogram-chart-plugin';
import * as lokiPlugin from '@perses-dev/loki-plugin';
import * as markdownPlugin from '@perses-dev/markdown-plugin';
import * as pieChartPlugin from '@perses-dev/pie-chart-plugin';
import * as prometheusPlugin from '@perses-dev/prometheus-plugin';
import * as pyroscopePlugin from '@perses-dev/pyroscope-plugin';
import * as scatterChartPlugin from '@perses-dev/scatter-chart-plugin';
import * as statChartPlugin from '@perses-dev/stat-chart-plugin';
import * as staticListVariablePlugin from '@perses-dev/static-list-variable-plugin';
import * as statusHistoryChartPlugin from '@perses-dev/status-history-chart-plugin';
import * as tablePlugin from '@perses-dev/table-plugin';
import * as tempoPlugin from '@perses-dev/tempo-plugin';
import * as timeseriesChartPlugin from '@perses-dev/timeseries-chart-plugin';
import * as timeSeriesTablePlugin from '@perses-dev/timeseries-table-plugin';
import * as traceTablePlugin from '@perses-dev/trace-table-plugin';
import * as tracingGanttChartPlugin from '@perses-dev/tracing-gantt-chart-plugin';

export const pluginLoader = dynamicImportPluginLoader([
  {
    resource: barchartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(barchartPlugin),
  },
  {
    resource: datasourceVariablePlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(datasourceVariablePlugin),
  },
  {
    resource: flameChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(flameChartPlugin),
  },
  {
    resource: gaugeChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(gaugeChartPlugin),
  },
  {
    resource: heatmapChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(heatmapChartPlugin),
  },
  {
    resource: histogramChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(histogramChartPlugin),
  },
  {
    resource: lokiPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(lokiPlugin),
  },
  {
    resource: markdownPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(markdownPlugin),
  },
  {
    resource: pieChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(pieChartPlugin),
  },
  {
    resource: prometheusPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(prometheusPlugin),
  },
  {
    resource: pyroscopePlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(pyroscopePlugin),
  },
  {
    resource: scatterChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(scatterChartPlugin),
  },
  {
    resource: statChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(statChartPlugin),
  },
  {
    resource: staticListVariablePlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(staticListVariablePlugin),
  },
  {
    resource: statusHistoryChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(statusHistoryChartPlugin),
  },
  {
    resource: tablePlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(tablePlugin),
  },
  {
    resource: tempoPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(tempoPlugin),
  },
  {
    resource: timeseriesChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(timeseriesChartPlugin),
  },
  {
    resource: timeSeriesTablePlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(timeSeriesTablePlugin),
  },
  {
    resource: traceTablePlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(traceTablePlugin),
  },
  {
    resource: tracingGanttChartPlugin.getPluginModule(),
    importPlugin: () => Promise.resolve(tracingGanttChartPlugin),
  },
]);
