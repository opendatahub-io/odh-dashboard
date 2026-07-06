import * as React from 'react';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import DeleteExperimentModal from '#~/pages/pipelines/global/experiments/DeleteExperimentModal';
import { RestoreExperimentModal } from '#~/pages/pipelines/global/experiments/RestoreExperimentModal';
import ExperimentTableBase from './ExperimentTableBase';
import { ArchivedExperimentTableToolbar } from './ExperimentTableToolbar';

type ArchivedExperimentTableProps = Omit<
  React.ComponentProps<typeof ExperimentTableBase>,
  'toolbarContentRenderer' | 'getActionColumnItems'
>;

const ArchivedExperimentTable: React.FC<ArchivedExperimentTableProps> = ({ ...baseTable }) => {
  const { experiments } = baseTable;

  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [deleteExperiment, setDeleteExperiment] = React.useState<ExperimentKF>();
  const [restoreExperiments, setRestoreExperiments] = React.useState<ExperimentKF[]>([]);

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
          { isSeparator: true },
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
                  .map<ExperimentKF | undefined>((selection) =>
                    experiments.find(
                      ({ experiment_id: experimentId }) => experimentId === selection,
                    ),
                  )
                  .filter((v): v is ExperimentKF => !!v),
              );
              setIsRestoreModalOpen(true);
            }}
          />
        )}
      />
      {isRestoreModalOpen ? (
        <RestoreExperimentModal
          experiments={restoreExperiments}
          onCancel={() => setIsRestoreModalOpen(false)}
        />
      ) : null}
      {deleteExperiment ? (
        <DeleteExperimentModal
          onCancel={() => setDeleteExperiment(undefined)}
          experiment={deleteExperiment}
        />
      ) : null}
    </>
  );
};

export default ArchivedExperimentTable;
