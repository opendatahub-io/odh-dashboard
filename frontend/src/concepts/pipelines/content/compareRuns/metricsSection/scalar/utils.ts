import { SortableData } from '#~/components/table';
import {
  getExecutionDisplayName,
  getArtifactName,
} from '#~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { RunArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { getMlmdMetadataValue } from '#~/pages/pipelines/global/experiments/executions/utils';
import { ScalarTableProps, XParentLabel, ScalarRowData, ScalarTableData } from './types';

export const generateTableStructure = (scalarMetricsArtifacts: RunArtifact[]): ScalarTableProps => {
  const subColumnLabels: string[] = [];
  const columnLabels: XParentLabel[] = [];
  const dataMap: { [key: string]: ScalarRowData } = {};

  scalarMetricsArtifacts.forEach((runArtifact) => {
    const runName = runArtifact.run.display_name || '-';
    const startArtifactIndex = subColumnLabels.length;

    runArtifact.executionArtifacts.forEach((executionArtifact) => {
      executionArtifact.linkedArtifacts.forEach((linkedArtifact) => {
        const xLabel = `${getExecutionDisplayName(executionArtifact.execution) || '-'} > ${
          getArtifactName(linkedArtifact) || '-'
        }`;
        subColumnLabels.push(xLabel);

        const customProperties = linkedArtifact.artifact.getCustomPropertiesMap();

        customProperties.getEntryList().forEach(([key]) => {
          if (key !== 'display_name') {
            if (!(key in dataMap)) {
              dataMap[key] = { row: Array(subColumnLabels.length).fill(''), dataCount: 0 };
            }
            dataMap[key].row[subColumnLabels.length - 1] = JSON.stringify(
              getMlmdMetadataValue(customProperties.get(key)),
            );
            dataMap[key].dataCount++;
          }
        });
      });
    });

    columnLabels.push({ label: runName, colSpan: subColumnLabels.length - startArtifactIndex });
  });

  // Prepare columns and subColumns
  const columns: SortableData<ScalarTableData>[] = [
    {
      label: 'Run name',
      field: 'run-name',
      isStickyColumn: true,
      hasRightBorder: true,
      // Utility class pf-v6-u-background-color-200 does not exist in v6 currently but a replacement may be added, replacing with secondary background color token for now
      className: 'pf-v6-u-background-color-200',
      style: {
        backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
      },
      sortable: false,
    },
    ...columnLabels.map(
      (parent, index): SortableData<ScalarTableData> => ({
        label: parent.label,
        field: parent.label,
        colSpan: parent.colSpan,
        sortable: false,
        modifier: 'nowrap',
        hasRightBorder: index !== columnLabels.length - 1,
      }),
    ),
  ];

  const subColumns: SortableData<ScalarTableData>[] = [
    {
      label: 'Execution name > Artifact name',
      field: 'execution-name-artifact-name',
      isStickyColumn: true,
      hasRightBorder: true,
      // Utility class pf-v6-u-background-color-200 does not exist in v6 currently but a replacement may be added, replacing with secondary background color token for now
      className: 'pf-v6-u-background-color-200',
      style: {
        backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
      },
      sortable: false,
    },
    ...subColumnLabels.map(
      (label, index): SortableData<ScalarTableData> => ({
        label,
        field: label,
        sortable: false,
        modifier: 'nowrap',
        hasRightBorder: index !== subColumnLabels.length - 1,
      }),
    ),
  ];

  // Prepare data rows and sort them
  const sortedDataList = Object.entries(dataMap).toSorted(
    (a, b) => b[1].dataCount - a[1].dataCount,
  );

  return {
    columns,
    subColumns,
    data: sortedDataList.map(([key]) => ({ key, values: dataMap[key].row })),
  };
};
