import * as React from 'react';
import SimpleMenuActions from '~/components/SimpleMenuActions';

type RunTableToolbarActionsProps = {
  deleteAllEnabled: boolean;
  onDeleteAll: () => void;
};

const RunTableToolbarActions: React.FC<RunTableToolbarActionsProps> = ({
  deleteAllEnabled,
  onDeleteAll,
}) => {
  const [, setCreateExperiment] = React.useState(false);
  return (
    <>
      <SimpleMenuActions
        dropdownItems={[
          {
            key: 'create-experiment',
            label: 'Create experiment',
            onClick: () => setCreateExperiment(true),
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
};

export default RunTableToolbarActions;
