import React from 'react';
import {
  FormSection,
  Flex,
  FlexItem,
  Button,
  Content,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Identifier } from '~/types';
import NodeResourceTable from './nodeResource/NodeResourceTable';
import ManageNodeResourceModal from './nodeResource/ManageNodeResourceModal';

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
            <FlexItem>
              <Content component="p" className="odh-form-section__desc">
                Every hardware profile must include CPU and memory resources. Additional resources,
                such as GPUs, can be added here.
              </Content>
            </FlexItem>
          </Flex>
        }
      >
        <Stack hasGutter>
          <StackItem>
            <NodeResourceTable
              nodeResources={nodeResources}
              onUpdate={(newIdentifiers) => setNodeResources(newIdentifiers)}
            />
          </StackItem>
        </Stack>
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

export default ManageNodeResourceSection;
