import * as React from 'react';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import DeleteExperimentModal from '~/pages/pipelines/global/experiments/DeleteExperimentModal';
import { RestoreExperimentModal } from '~/pages/pipelines/global/experiments/RestoreExperimentModal';
import ExperimentTableBase from './ExperimentTableBase';
import { ArchivedExperimentTableToolbar } from './ExperimentTableToolbar';

type ArchivedExperimentTableProps = Omit<
  React.ComponentProps<typeof ExperimentTableBase>,
  'toolbarContentRenderer' | 'getActionColumnItems'
>;

const ArchivedExperimentTable: React.FC<ArchivedExperimentTableProps> = ({ ...baseTable }) => {
  const { experiments } = baseTable;

  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [deleteExperiment, setDeleteExperiment] = React.useState<ExperimentKFv2>();
  const [restoreExperiments, setRestoreExperiments] = React.useState<ExperimentKFv2[]>([]);

  return (
    <>
      <ExperimentTableBase
        {...baseTable}
        getActionColumnItems={(experiment) => [
          {
            title: 'Restore',
            onClick: () => {
              setRestoreExperiments([experiment]);
              setIsRestoreModalOpen(true);
            },
          },
          {
            title: 'Delete',
            isDisabled: experiment.display_name === 'Default',
            onClick: () => {
              setDeleteExperiment(experiment);
            },
          },
        ]}
        toolbarContentRenderer={(selections) => (
          <ArchivedExperimentTableToolbar
            restoreAllEnabled={selections.length > 0}
            onRestoreAll={() => {
              setRestoreExperiments(
                selections
                  .map<ExperimentKFv2 | undefined>((selection) =>
                    experiments.find(
                      ({ experiment_id: experimentId }) => experimentId === selection,
                    ),
                  )
                  .filter((v): v is ExperimentKFv2 => !!v),
              );
              setIsRestoreModalOpen(true);
            }}
          />
        )}
      />
      <RestoreExperimentModal
        isOpen={isRestoreModalOpen}
        experiments={restoreExperiments}
        onCancel={() => setIsRestoreModalOpen(false)}
      />
      <DeleteExperimentModal
        onCancel={() => setDeleteExperiment(undefined)}
        experiment={deleteExperiment}
      />
    </>
  );
};

export default ArchivedExperimentTable;
