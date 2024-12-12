import React from 'react';
import { FormSection, Flex, FlexItem, Button } from '@patternfly/react-core';
import { Identifier } from '~/types';
import NodeResourceTable from './nodeResource/NodeResourceTable';
import ManageNodeResourceModal from './nodeResource/ManageNodeResourceModal';

type ManageNodeResourceSectionProps = {
  identifiers: Identifier[];
  setIdentifiers: (identifiers: Identifier[]) => void;
};

export const ManageNodeResourceSection: React.FC<ManageNodeResourceSectionProps> = ({
  identifiers,
  setIdentifiers,
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
          identifiers={identifiers}
          onUpdate={(newIdentifiers) => setIdentifiers(newIdentifiers)}
        />
      </FormSection>
      {isNodeResourceModalOpen ? (
        <ManageNodeResourceModal
          onClose={() => setIsNodeResourceModalOpen(false)}
          onSave={(identifier) => setIdentifiers([...identifiers, identifier])}
        />
      ) : null}
    </>
  );
};
