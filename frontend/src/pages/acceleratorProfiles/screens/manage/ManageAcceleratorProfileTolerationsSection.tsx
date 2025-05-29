import { FormSection, Flex, FlexItem, Button } from '@patternfly/react-core';
import React from 'react';
import { Toleration } from '#~/types';
import { ManageAcceleratorProfileSectionTitles } from './const';
import ManageTolerationModal from './tolerations/ManageTolerationModal';
import { TolerationsTable } from './tolerations/TolerationsTable';
import { ManageAcceleratorProfileSectionID } from './types';

type ManageAcceleratorProfileTolerationsSectionProps = {
  tolerations: Toleration[];
  setTolerations: (tolerations: Toleration[]) => void;
};

export const ManageAcceleratorProfileTolerationsSection: React.FC<
  ManageAcceleratorProfileTolerationsSectionProps
> = ({ tolerations, setTolerations }) => {
  const [manageTolerationModalOpen, setManageTolerationModalOpen] = React.useState<boolean>(false);
  return (
    <>
      <FormSection
        id={ManageAcceleratorProfileSectionID.TOLERATIONS}
        aria-label={
          ManageAcceleratorProfileSectionTitles[ManageAcceleratorProfileSectionID.TOLERATIONS]
        }
        title={
          <Flex>
            <FlexItem>
              {ManageAcceleratorProfileSectionTitles[ManageAcceleratorProfileSectionID.TOLERATIONS]}
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
          onUpdate={(newTolerations) => setTolerations(newTolerations)}
        />
      </FormSection>
      {manageTolerationModalOpen ? (
        <ManageTolerationModal
          onClose={() => setManageTolerationModalOpen(false)}
          onSave={(toleration) => setTolerations([...tolerations, toleration])}
        />
      ) : null}
    </>
  );
};
