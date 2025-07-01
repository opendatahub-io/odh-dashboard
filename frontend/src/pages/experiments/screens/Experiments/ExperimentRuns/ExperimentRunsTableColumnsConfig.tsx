import { SortableData } from 'mod-arch-shared';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { checkboxTableColumn } from '#~/components/table';

type ColumnSelectorItem = {
  id: string;
  name: string;
  checked: boolean;
};

type ColumnSelection = {
  metrics: ColumnSelectorItem[];
  parameters: ColumnSelectorItem[];
  tags: ColumnSelectorItem[];
};

type ColumnConfig = {
  baseColumns: SortableData<RegistryExperimentRun>[];
  dynamicColumns: SortableData<RegistryExperimentRun>[];
  nestedHeaderConfig: {
    hasNested: boolean;
    groups: Array<{
      label: string;
      colSpan: number;
      fields: string[];
    }>;
  };
};

export const createExperimentRunsColumns = (selectedColumns: ColumnSelection): ColumnConfig => {
  // Base columns that are always present
  const baseColumns: SortableData<RegistryExperimentRun>[] = [
    checkboxTableColumn(),
    {
      field: 'name',
      label: 'Run name',
      sortable: true,
    },
    {
      field: 'owner',
      label: 'Owner',
      sortable: true,
    },
    {
      field: 'status',
      label: 'Status',
      sortable: true,
    },
    {
      field: 'state',
      label: 'State',
      sortable: true,
    },
    {
      field: 'startTimeSinceEpoch',
      label: 'Started',
      sortable: true,
    },
    {
      field: 'endTimeSinceEpoch',
      label: 'Ended',
      sortable: true,
    },
  ];

  // Dynamic columns based on selection
  const dynamicColumns: SortableData<RegistryExperimentRun>[] = [];
  const groups: Array<{ label: string; colSpan: number; fields: string[] }> = [];

  // Add metrics columns
  const selectedMetrics = selectedColumns.metrics.filter((item) => item.checked);
  if (selectedMetrics.length > 0) {
    selectedMetrics.forEach((metric) => {
      dynamicColumns.push({
        field: `metric_${metric.id}`,
        label: metric.name,
        sortable: false,
      });
    });
    groups.push({
      label: 'Metrics',
      colSpan: selectedMetrics.length,
      fields: selectedMetrics.map((m) => `metric_${m.id}`),
    });
  }

  // Add parameters columns
  const selectedParameters = selectedColumns.parameters.filter((item) => item.checked);
  if (selectedParameters.length > 0) {
    selectedParameters.forEach((param) => {
      dynamicColumns.push({
        field: `parameter_${param.id}`,
        label: param.name,
        sortable: false,
      });
    });
    groups.push({
      label: 'Parameters',
      colSpan: selectedParameters.length,
      fields: selectedParameters.map((p) => `parameter_${p.id}`),
    });
  }

  // Add tags columns
  const selectedTags = selectedColumns.tags.filter((item) => item.checked);
  if (selectedTags.length > 0) {
    selectedTags.forEach((tag) => {
      dynamicColumns.push({
        field: `tag_${tag.id}`,
        label: tag.name,
        sortable: false,
      });
    });
    groups.push({
      label: 'Tags',
      colSpan: selectedTags.length,
      fields: selectedTags.map((t) => `tag_${t.id}`),
    });
  }

  // Add kebab column at the end
  baseColumns.push({
    field: 'kebab',
    label: '',
    sortable: false,
  });

  const hasNested = groups.length > 0;

  return {
    baseColumns,
    dynamicColumns,
    nestedHeaderConfig: {
      hasNested,
      groups,
    },
  };
};

export type { ColumnSelection, ColumnSelectorItem, ColumnConfig };
