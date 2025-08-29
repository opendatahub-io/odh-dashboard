import React from 'react';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { ModelVersion } from '~/app/types';
import DeployModalExtension from '~/odh/components/DeployModalExtension';

type MRVersionRowActionColumnsProps = {
  mv: ModelVersion;
  actions: IAction[];
};

const MRVersionRowActionColumns: React.FC<MRVersionRowActionColumnsProps> = ({ mv, actions }) => (
  <DeployModalExtension
    mv={mv}
    render={(buttonState, onOpenModal, isModalAvailable) =>
      isModalAvailable ? (
        <ActionsColumn
          items={[
            {
              title: 'Deploy',
              onClick: onOpenModal,
              isAriaDisabled: !buttonState.enabled,
              tooltipProps: !buttonState.tooltip ? { content: buttonState.tooltip } : undefined,
            },
            ...actions,
          ]}
        />
      ) : (
        <ActionsColumn items={actions} />
      )
    }
  />
);

export default MRVersionRowActionColumns;
