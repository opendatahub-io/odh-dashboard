import * as React from 'react';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import { ArchiveExperimentModal } from '~/pages/pipelines/global/experiments/ArchiveExperimentModal';
import ExperimentTableBase from './ExperimentTableBase';
import { ActiveExperimentTableToolbar } from './ExperimentTableToolbar';

type ActiveExperimentTableProps = Omit<
  React.ComponentProps<typeof ExperimentTableBase>,
  'toolbarContentRenderer' | 'getActionColumnItems'
>;

const ActiveExperimentTable: React.FC<ActiveExperimentTableProps> = ({ ...baseTable }) => {
  const { experiments } = baseTable;

  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [archiveExperiments, setArchiveExperiments] = React.useState<ExperimentKFv2[]>([]);

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
                  .map<ExperimentKFv2 | undefined>((selection) =>
                    experiments.find(
                      ({ experiment_id: experimentId }) => experimentId === selection,
                    ),
                  )
                  .filter((v): v is ExperimentKFv2 => !!v),
              );
              setIsArchiveModalOpen(true);
            }}
          />
        )}
      />
      <ArchiveExperimentModal
        isOpen={isArchiveModalOpen}
        experiments={archiveExperiments}
        onCancel={() => setIsArchiveModalOpen(false)}
      />
    </>
  );
};

export default ActiveExperimentTable;
