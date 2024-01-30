import * as React from 'react';
import SimpleMenuActions from '~/components/SimpleMenuActions';

type RunTableToolbarActionsProps = {
  deleteAllEnabled: boolean;
  onDeleteAll: () => void;
};

const RunTableToolbarActions: React.FC<RunTableToolbarActionsProps> = ({
  deleteAllEnabled,
  onDeleteAll,
}) => (
  // const [createExperiment, setCreateExperiment] = React.useState(false);
  <>
    <SimpleMenuActions
      data-testid="run-table-toolbar-actions"
      dropdownItems={[
        // {
        //   key: 'create-experiment',
        //   label: 'Create experiment',
        //   onClick: () => setCreateExperiment(true),
        // },
        // { isSpacer: true },
        {
          key: 'delete-selected',
          label: 'Delete selected',
          onClick: onDeleteAll,
          isDisabled: !deleteAllEnabled,
        },
      ]}
    />
    {/*<ManageExperimentModal isOpen={createExperiment} onClose={() => setCreateExperiment(false)} />*/}
  </>
);
export default RunTableToolbarActions;
