import React from 'react';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { ModelVersion } from '~/app/types';
import useDeployModalExtension from '~/odh/hooks/useDeployModalExtension';

type MRVersionRowActionColumnsProps = {
  mv: ModelVersion;
  mvLoaded: boolean;
  mvError: Error | undefined;
  actions: IAction[];
};

const MRVersionRowActionColumns: React.FC<MRVersionRowActionColumnsProps> = ({
  mv,
  mvLoaded,
  mvError,
  actions,
}) => {
  const { deployModal, setOpenModal, buttonState } = useDeployModalExtension({
    mv,
    mvLoaded,
    mvError,
  });

  const deployActions: IAction[] = buttonState?.visible
    ? [
        {
          title: 'Deploy',
          onClick: () => setOpenModal(true),
          isAriaDisabled: !buttonState.enabled,
          tooltipProps: !buttonState.enabled ? { content: buttonState.tooltip } : undefined,
        },
        ...actions,
      ]
    : actions;

  return (
    <>
      <ActionsColumn items={deployActions} />
      {deployModal}
    </>
  );
};

export default MRVersionRowActionColumns;
