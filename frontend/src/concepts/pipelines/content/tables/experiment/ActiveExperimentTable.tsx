import * as React from 'react';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { ArchiveExperimentModal } from '#~/pages/pipelines/global/experiments/ArchiveExperimentModal';
import ExperimentTableBase from './ExperimentTableBase';
import { ActiveExperimentTableToolbar } from './ExperimentTableToolbar';

type ActiveExperimentTableProps = Omit<
  React.ComponentProps<typeof ExperimentTableBase>,
  'toolbarContentRenderer' | 'getActionColumnItems'
>;

const ActiveExperimentTable: React.FC<ActiveExperimentTableProps> = ({ ...baseTable }) => {
  const { experiments } = baseTable;

  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [archiveExperiments, setArchiveExperiments] = React.useState<ExperimentKF[]>([]);

  return (
    <>
      <ExperimentTableBase
        {...baseTable}
        getActionColumnItems={(experiment) => [
          {
            title: 'Archive',
            onClick: () => {
              setArchiveExperiments([experiment]);
              setIsArchiveModalOpen(true);
            },
          },
        ]}
        toolbarContentRenderer={(selections) => (
          <ActiveExperimentTableToolbar
            archiveAllEnabled={selections.length > 0}
            onArchiveAll={() => {
              setArchiveExperiments(
                selections
                  .map<ExperimentKF | undefined>((selection) =>
                    experiments.find(
                      ({ experiment_id: experimentId }) => experimentId === selection,
                    ),
                  )
                  .filter((v): v is ExperimentKF => !!v),
              );
              setIsArchiveModalOpen(true);
            }}
          />
        )}
      />
      {isArchiveModalOpen ? (
        <ArchiveExperimentModal
          experiments={archiveExperiments}
          onCancel={() => setIsArchiveModalOpen(false)}
        />
      ) : null}
    </>
  );
};

export default ActiveExperimentTable;
