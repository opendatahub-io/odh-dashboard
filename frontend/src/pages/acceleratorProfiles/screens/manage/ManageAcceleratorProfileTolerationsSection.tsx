import { FormSection, Flex, FlexItem, Button } from '@patternfly/react-core';
import React from 'react';
import { PodToleration } from '~/types';
import { ManageAcceleratorSectionTitles } from './const';
import ManageTolerationModal from './tolerations/ManageTolerationModal';
import { TolerationsTable } from './tolerations/TolerationsTable';
import { ManageAcceleratorSectionID } from './types';

type ManageAcceleratorProfileTolerationsSectionProps = {
  tolerations: PodToleration[];
  setTolerations: (tolerations: PodToleration[]) => void;
};

export const ManageAcceleratorProfileTolerationsSection = ({
  tolerations,
  setTolerations,
}: ManageAcceleratorProfileTolerationsSectionProps) => {
  const [manageTolerationModalOpen, setManageTolerationModalOpen] = React.useState<boolean>(false);
  return (
    <>
      <FormSection
        id={ManageAcceleratorSectionID.TOLERATIONS}
        aria-label={ManageAcceleratorSectionTitles[ManageAcceleratorSectionID.TOLERATIONS]}
        title={
          <Flex>
            <FlexItem>
              {ManageAcceleratorSectionTitles[ManageAcceleratorSectionID.TOLERATIONS]}
            </FlexItem>
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => setManageTolerationModalOpen(true)}
                data-testid="add-toleration-button"
              >
                Add toleration
              </Button>
            </FlexItem>
          </Flex>
        }
      >
        <TolerationsTable
          tolerations={tolerations}
          onUpdate={(tolerations) => setTolerations(tolerations)}
        />
      </FormSection>
      <ManageTolerationModal
        isOpen={manageTolerationModalOpen}
        onClose={() => setManageTolerationModalOpen(false)}
        onSave={(toleration) => setTolerations([...tolerations, toleration])}
      />
    </>
  );
};
