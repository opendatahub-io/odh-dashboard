import React from 'react';
import { FormSection, Flex, FlexItem, Button } from '@patternfly/react-core';
import { Identifier } from '~/types';
import NodeResourceTable from './nodeResource/NodeResourceTable';
import ManageNodeResourceModal from './nodeResource/ManageNodeResourceModal';

type ManageNodeResourceSectionProps = {
  nodeResources: Identifier[];
  setNodeResources: (identifiers: Identifier[]) => void;
};

export const ManageNodeResourceSection: React.FC<ManageNodeResourceSectionProps> = ({
  nodeResources,
  setNodeResources,
}) => {
  const [isNodeResourceModalOpen, setIsNodeResourceModalOpen] = React.useState<boolean>(false);
  return (
    <>
      <FormSection
        title={
          <Flex>
            <FlexItem>Node resources</FlexItem>
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
        <NodeResourceTable
          nodeResources={nodeResources}
          onUpdate={(newIdentifiers) => setNodeResources(newIdentifiers)}
        />
      </FormSection>
      {isNodeResourceModalOpen ? (
        <ManageNodeResourceModal
          onClose={() => setIsNodeResourceModalOpen(false)}
          onSave={(identifier) => setNodeResources([...nodeResources, identifier])}
          nodeResources={nodeResources}
        />
      ) : null}
    </>
  );
};
