import * as React from 'react';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import ExperimentTableBase from './ExperimentTableBase';
import { ArchivedExperimentTableToolbar } from './ExperimentTableToolbar';

type ArchivedExperimentTableProps = Omit<
  React.ComponentProps<typeof ExperimentTableBase>,
  'toolbarContentRenderer' | 'getActionColumnItems'
>;

const ArchivedExperimentTable: React.FC<ArchivedExperimentTableProps> = ({ ...baseTable }) => {
  const { experiments } = baseTable;

  const [, setRestoreResources] = React.useState<ExperimentKFv2[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onRestore = (experiment: ExperimentKFv2) => null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onDelete = (experiment: ExperimentKFv2) => null;

  return (
    <>
      <ExperimentTableBase
        {...baseTable}
        getActionColumnItems={(experiment) => [
          {
            title: 'Restore',
            onClick: () => {
              onRestore(experiment);
            },
          },
          {
            title: 'Delete',
            isDisabled: experiment.display_name === 'Default',
            onClick: () => {
              onDelete(experiment);
            },
          },
        ]}
        toolbarContentRenderer={(selections) => (
          <ArchivedExperimentTableToolbar
            restoreAllEnabled={selections.length > 0}
            onRestoreAll={() =>
              setRestoreResources(
                selections
                  .map<ExperimentKFv2 | undefined>((selection) =>
                    experiments.find(
                      ({ experiment_id: experimentId }) => experimentId === selection,
                    ),
                  )
                  .filter((v): v is ExperimentKFv2 => !!v),
              )
            }
          />
        )}
      />
    </>
  );
};

export default ArchivedExperimentTable;
