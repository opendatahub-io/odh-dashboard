import * as React from 'react';
import { Table, TableProps, SortableData } from '~/components/table';
import { ExperimentKF, PipelineCoreResourceKF } from '~/concepts/pipelines/kfTypes';
import ExperimentsTableRow from '~/concepts/pipelines/content/tables/experiments/ExperimentsTableRow';
import { getPipelineCoreResourceExperimentReference } from '~/concepts/pipelines/content/tables/utils';

type BaseTableProps<T> = Omit<TableProps<T>, 'data' | 'variant' | 'rowRenderer' | 'tbodyProps'>;

type ExperimentsTableProps<T extends PipelineCoreResourceKF> = {
  data: T[];
  rowRenderer: (resource: PipelineCoreResourceKF) => React.ReactNode;
  experiments: ExperimentKF[];
} & BaseTableProps<T>;

type Data<T> = {
  experimentResource?: ExperimentKF;
  name: string;
  description: string;
  containedResources: T[];
};

const DEFAULT_EXPERIMENT_NAME = 'Default';

const ExperimentsTable = <T extends PipelineCoreResourceKF>({
  data,
  columns,
  rowRenderer,
  experiments,
  ...tableProps
}: ExperimentsTableProps<T>) => {
  const tableData: Data<T>[] = Object.values(
    data.reduce<{ [experimentId: string]: Data<T> }>(
      (acc, resource) => {
        const experimentReference = getPipelineCoreResourceExperimentReference(resource);

        let name: string;
        let description = '';
        let experimentResource: ExperimentKF | undefined;
        if (experimentReference) {
          experimentResource = experiments.find((e) => e.id === experimentReference.key.id);
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
          experimentData = {
            name,
            description,
            experimentResource: experimentResource,
            containedResources: [],
          };
        }
        experimentData.containedResources.push(resource);

        return { ...acc, [name]: experimentData };
      },
      experiments.reduce<{ [experimentId: string]: Data<T> }>(
        (acc, experiment) => ({
          ...acc,
          [experiment.name]: {
            name: experiment.name,
            description: experiment.description || '',
            experimentResource: experiment,
            containedResources: [],
          },
        }),
        {},
      ),
    ),
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
          experimentResource={data.experimentResource}
          rowIndex={rowIndex}
          columnCount={tableColumns.length}
          expandedData={data.containedResources}
          renderRow={rowRenderer}
        />
      )}
    />
  );
};

export default ExperimentsTable;
