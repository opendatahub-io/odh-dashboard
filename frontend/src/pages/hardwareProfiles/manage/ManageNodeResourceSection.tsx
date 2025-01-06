import React from 'react';
import { FormSection, Flex, FlexItem, Button } from '@patternfly/react-core';
import { Identifier } from '~/types';
import NodeResourceTable from '~/pages/hardwareProfiles/nodeResource/NodeResourceTable';
import ManageNodeResourceModal from '~/pages/hardwareProfiles/nodeResource/ManageNodeResourceModal';
import { ManageHardwareProfileSectionTitles } from '~/pages/hardwareProfiles/const';
import { ManageHardwareProfileSectionID } from '~/pages/hardwareProfiles/manage/types';

type ManageNodeResourceSectionProps = {
  nodeResources: Identifier[];
  setNodeResources: (identifiers: Identifier[]) => void;
};

const ManageNodeResourceSection: React.FC<ManageNodeResourceSectionProps> = ({
  nodeResources,
  setNodeResources,
}) => {
  const [isNodeResourceModalOpen, setIsNodeResourceModalOpen] = React.useState<boolean>(false);
  return (
    <>
      <FormSection
        title={
          <Flex>
            <FlexItem>
              {ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.IDENTIFIERS]}
            </FlexItem>
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => setIsNodeResourceModalOpen(true)}
                data-testid="add-node-resource-button"
              >
                Add resource
              </Button>
            </FlexItem>
          </Flex>
        }
      >
        Every hardware profile must include CPU and memory resources. Additional resources, such as
        GPUs, can be added here.
        <NodeResourceTable
          nodeResources={nodeResources}
          onUpdate={(newResources) => setNodeResources(newResources)}
        />
      </FormSection>
      {isNodeResourceModalOpen && (
        <ManageNodeResourceModal
          onClose={() => setIsNodeResourceModalOpen(false)}
          onSave={(identifier) => setNodeResources([...nodeResources, identifier])}
          nodeResources={nodeResources}
        />
      )}
    </>
  );
};

export default ManageNodeResourceSection;
