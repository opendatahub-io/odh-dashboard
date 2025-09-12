import React from 'react';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { ModelVersion } from '~/app/types';
import DeployModalExtension from '~/odh/components/DeployModalExtension';
import LabTuneModalExtension from '~/odh/components/LabTuneModalExtension';

type MRVersionRowActionColumnsProps = {
  mv: ModelVersion;
  actions: IAction[];
};

const MRVersionRowActionColumns: React.FC<MRVersionRowActionColumnsProps> = ({ mv, actions }) => (
  <DeployModalExtension
    mv={mv}
    render={(deployButtonState, onOpenDeployModal, isDeployModalAvailable) => (
      <LabTuneModalExtension
        mv={mv}
        render={(labTuneButtonState, onOpenLabTuneModal, isLabTuneModalAvailable) => {
          const allActions: IAction[] = [];
          
          // Add Deploy action if available
          if (isDeployModalAvailable) {
            allActions.push({
              title: 'Deploy',
              onClick: onOpenDeployModal,
              isAriaDisabled: !deployButtonState.enabled,
              tooltipProps: deployButtonState.tooltip ? { content: deployButtonState.tooltip } : undefined,
            });
          }
          
          // Add LAB-tune action if available
          if (isLabTuneModalAvailable) {
            allActions.push({
              title: 'LAB-tune',
              onClick: onOpenLabTuneModal,
              isAriaDisabled: !labTuneButtonState.enabled,
              tooltipProps: labTuneButtonState.tooltip ? { content: labTuneButtonState.tooltip } : undefined,
            });
          }
          
          // Add original actions
          allActions.push(...actions);
          
          return <ActionsColumn items={allActions} />;
        }}
      />
    )}
  />
);

export default MRVersionRowActionColumns;
