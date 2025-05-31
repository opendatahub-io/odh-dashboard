import React from 'react';
import { FormSection, Button, Flex, FlexItem } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import { Toleration } from '#~/types';
import ManageTolerationModal from '#~/pages/hardwareProfiles/toleration/ManageTolerationModal';
import TolerationTable from '#~/pages/hardwareProfiles/toleration/TolerationTable';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types';

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
      <FormSection
        title={
          <Flex>
            <FlexItem>
              {ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.TOLERATIONS]}
            </FlexItem>
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
          </Flex>
        }
      >
        Tolerations are applied to pods and allow the scheduler to schedule pods on nodes with
        matching taints.
        {tolerations.length !== 0 && (
          <TolerationTable
            tolerations={tolerations}
            onUpdate={(newTolerations) => setTolerations(newTolerations)}
          />
        )}
      </FormSection>
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
    </>
  );
};

export default ManageTolerationSection;
