import * as React from 'react';
import { Spinner } from '@patternfly/react-core';
import Table, { TableProps } from '~/components/table/Table';
import { PipelineCoreResourceKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import ExperimentsTableRow from '~/concepts/pipelines/content/tables/experiments/ExperimentsTableRow';
import { SortableData } from '~/components/table/useTableColumnSort';
import { getPipelineCoreResourceExperimentReference } from '~/concepts/pipelines/content/tables/utils';
import useExperiments from '~/concepts/pipelines/apiHooks/useExperiements';

type BaseTableProps<T> = Omit<TableProps<T>, 'data' | 'variant' | 'rowRenderer'>;

type ExperimentsTableProps<T extends PipelineCoreResourceKF> = {
  data: T[];
  onDeleteRun: (run: PipelineRunKF) => void;
} & BaseTableProps<T>;

type Data<T> = { name: string; description: string; containedResources: T[] };

const DEFAULT_EXPERIMENT_NAME = 'Default';

const ExperimentsTable = <T extends PipelineCoreResourceKF>({
  data,
  columns,
  onDeleteRun,
  ...tableProps
}: ExperimentsTableProps<T>) => {
  const [experiments, loaded] = useExperiments();

  if (!loaded) {
    return <Spinner />;
  }

  const tableData: Data<T>[] = Object.values(
    data.reduce<{ [experimentId: string]: Data<T> }>((acc, resource) => {
      const experimentReference = getPipelineCoreResourceExperimentReference(resource);

      let name: string;
      let description = '';
      if (experimentReference) {
        const experimentResource = experiments.find((e) => e.id === experimentReference.key.id);
        if (!experimentResource) {
          name = experimentReference.name || DEFAULT_EXPERIMENT_NAME;
        } else {
          name = experimentResource.name;
          description = experimentResource.description || '';
        }
      } else {
        name = DEFAULT_EXPERIMENT_NAME;
        description = 'Runs that do not belong to an experiment';
      }

      let experimentData = acc[name];
      if (!experimentData) {
        experimentData = { name, description, containedResources: [] };
      }
      experimentData.containedResources.push(resource);

      return { ...acc, [name]: experimentData };
    }, {}),
  );
  const tableColumns: SortableData<Data<T>>[] = columns.map((column) => ({
    ...column,
    sortable: false,
  }));

  return (
    <Table<Data<T>>
      {...tableProps}
      disableRowRenderSupport
      data={tableData}
      columns={tableColumns}
      rowRenderer={(data, rowIndex) => (
        <ExperimentsTableRow
          key={data.name}
          experimentName={data.name}
          experimentDescription={data.description}
          rowIndex={rowIndex}
          columnCount={tableColumns.length}
          expandedData={data.containedResources}
          onDeleteRun={onDeleteRun}
        />
      )}
    />
  );
};

export default ExperimentsTable;
