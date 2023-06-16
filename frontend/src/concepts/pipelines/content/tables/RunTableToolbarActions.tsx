import * as React from 'react';
import SimpleMenuActions from '~/components/SimpleMenuActions';

type RunTableToolbarActionsProps = {
  deleteAllEnabled: boolean;
  onDeleteAll: () => void;
  onCreateExperiment: () => void;
};

const RunTableToolbarActions: React.FC<RunTableToolbarActionsProps> = ({
  deleteAllEnabled,
  onDeleteAll,
  onCreateExperiment,
}) => (
  <>
    <SimpleMenuActions
      dropdownItems={[
        {
          key: 'create-experiment',
          label: 'Create experiment',
          onClick: () => onCreateExperiment(),
        },
        { isSpacer: true },
        {
          key: 'delete-selected',
          label: 'Delete selected',
          onClick: onDeleteAll,
          isDisabled: !deleteAllEnabled,
        },
      ]}
    />
  </>
);
export default RunTableToolbarActions;
