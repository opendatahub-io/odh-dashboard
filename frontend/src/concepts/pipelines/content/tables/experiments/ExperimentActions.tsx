import * as React from 'react';
import SimpleMenuActions from '~/components/SimpleMenuActions';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';
import DeletePipelineCoreResourceModal from '~/concepts/pipelines/content/DeletePipelineCoreResourceModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type ExperimentActionsProps = {
  experiment: ExperimentKF;
};

const ExperimentActions: React.FC<ExperimentActionsProps> = ({ experiment }) => {
  const [deleteTarget, setDeleteTarget] = React.useState<ExperimentKF | null>(null);
  const { refreshAllAPI } = usePipelinesAPI();

  return (
    <>
      <SimpleMenuActions
        dropdownItems={[
          {
            key: 'delete-selected',
            label: 'Delete',
            onClick: () => setDeleteTarget(experiment),
          },
        ]}
      />
      <DeletePipelineCoreResourceModal
        toDeleteResources={deleteTarget ? [deleteTarget] : []}
        type="experiment"
        onClose={(deleted) => {
          setDeleteTarget(null);
          if (deleted) {
            refreshAllAPI();
            setDeleteTarget(null);
          } else {
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
};
export default ExperimentActions;
