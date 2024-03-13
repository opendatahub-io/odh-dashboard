import * as React from 'react';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import ExperimentTableBase from './ExperimentTableBase';
import { ActiveExperimentTableToolbar } from './ExperimentTableToolbar';

type ActiveExperimentTableProps = Omit<
  React.ComponentProps<typeof ExperimentTableBase>,
  'toolbarContentRenderer' | 'getActionColumnItems'
>;

const ActiveExperimentTable: React.FC<ActiveExperimentTableProps> = ({ ...baseTable }) => {
  const { experiments } = baseTable;

  const [, setArchiveResources] = React.useState<ExperimentKFv2[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onArchive = (experiment: ExperimentKFv2) => null;

  return (
    <>
      <ExperimentTableBase
        {...baseTable}
        getActionColumnItems={(experiment) => [
          {
            title: 'Archive',
            onClick: () => {
              onArchive(experiment);
            },
          },
        ]}
        toolbarContentRenderer={(selections) => (
          <ActiveExperimentTableToolbar
            archiveAllEnabled={selections.length > 0}
            onArchiveAll={() =>
              setArchiveResources(
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

export default ActiveExperimentTable;
