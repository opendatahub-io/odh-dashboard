import React from 'react';
import { FormSection, Button } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import { NodeSelector } from '~/types';
import ManageNodeSelectorModal from '~/pages/hardwareProfiles/nodeSelector/ManageNodeSelectorModal';
import NodeSelectorTable from '~/pages/hardwareProfiles/nodeSelector/NodeSelectorTable';

type ManageNodeSelectorSectionProps = {
  nodeSelectors: NodeSelector[];
  setNodeSelectors: (nodeSelectors: NodeSelector[]) => void;
};

const ManageNodeSelectorSection: React.FC<ManageNodeSelectorSectionProps> = ({
  nodeSelectors,
  setNodeSelectors,
}) => {
  const [isNodeSelectorModalOpen, setIsNodeSelectorModalOpen] = React.useState<boolean>(false);
  return (
    <>
      <FormSection title="Node resources">
        Node selectors are added to a pod spec to allow the pod to be scheduled on nodes with
        matching labels.
        {nodeSelectors.length !== 0 && (
          <NodeSelectorTable
            nodeSelectors={nodeSelectors}
            onUpdate={(newNodeSelectors) => setNodeSelectors(newNodeSelectors)}
          />
        )}
      </FormSection>
      {isNodeSelectorModalOpen && (
        <ManageNodeSelectorModal
          onClose={() => setIsNodeSelectorModalOpen(false)}
          onSave={(nodeSelector) => setNodeSelectors([...nodeSelectors, nodeSelector])}
        />
      )}
      <Button
        isInline
        icon={<AddCircleOIcon />}
        variant="link"
        onClick={() => setIsNodeSelectorModalOpen(true)}
        data-testid="add-node-selector-button"
      >
        Add node selector
      </Button>
    </>
  );
};

export default ManageNodeSelectorSection;
