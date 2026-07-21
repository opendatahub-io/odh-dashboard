import React from 'react';
import { Button, FlexItem, FormGroup } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import type { Toleration } from '@odh-dashboard/k8s-core';
import DashboardHelpTooltip from '@odh-dashboard/ui-core/components/DashboardHelpTooltip';
import { ManageHardwareProfileSectionID } from './types';
import ManageTolerationModal from '../toleration/ManageTolerationModal';
import TolerationTable from '../toleration/TolerationTable';
import { ManageHardwareProfileSectionTitles } from '../const';
import { HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP } from '../nodeResource/const.ts';

type ManageTolerationSectionProps = {
  tolerations: Toleration[];
  setTolerations: (tolerations: Toleration[]) => void;
};

const ManageTolerationSection: React.FC<ManageTolerationSectionProps> = ({
  tolerations,
  setTolerations,
}) => {
  const [isTolerationModalOpen, setIsTolerationModalOpen] = React.useState<boolean>(false);
  const isEmpty = tolerations.length === 0;
  return (
    <>
      <FormGroup
        label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.TOLERATIONS]}
        fieldId={ManageHardwareProfileSectionID.TOLERATIONS}
        labelHelp={
          <DashboardHelpTooltip content={HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP.tolerations} />
        }
      >
        {!isEmpty && (
          <FlexItem>
            <Button
              variant="secondary"
              onClick={() => setIsTolerationModalOpen(true)}
              data-testid="add-toleration-button"
            >
              Add toleration
            </Button>
          </FlexItem>
        )}
        {tolerations.length !== 0 && (
          <TolerationTable
            tolerations={tolerations}
            onUpdate={(newTolerations) => setTolerations(newTolerations)}
          />
        )}
        {isTolerationModalOpen && (
          <ManageTolerationModal
            onClose={() => setIsTolerationModalOpen(false)}
            onSave={(toleration) => setTolerations([...tolerations, toleration])}
          />
        )}
        {isEmpty && (
          <Button
            isInline
            icon={<AddCircleOIcon />}
            variant="link"
            onClick={() => setIsTolerationModalOpen(true)}
            data-testid="add-toleration-button"
          >
            Add toleration
          </Button>
        )}
      </FormGroup>
    </>
  );
};

export default ManageTolerationSection;
