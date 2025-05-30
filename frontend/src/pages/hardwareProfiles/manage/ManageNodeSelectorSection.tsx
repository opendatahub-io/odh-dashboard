import React from 'react';
import { FormSection, Button, Flex, FlexItem } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import { NodeSelector } from '#~/types';
import ManageNodeSelectorModal from '#~/pages/hardwareProfiles/nodeSelector/ManageNodeSelectorModal';
import NodeSelectorTable from '#~/pages/hardwareProfiles/nodeSelector/NodeSelectorTable';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types';

type ManageNodeSelectorSectionProps = {
  nodeSelector: NodeSelector;
  setNodeSelector: (nodeSelector: NodeSelector) => void;
};

const ManageNodeSelectorSection: React.FC<ManageNodeSelectorSectionProps> = ({
  nodeSelector,
  setNodeSelector,
}) => {
  const [isNodeSelectorModalOpen, setIsNodeSelectorModalOpen] = React.useState<boolean>(false);
  const isEmpty = Object.keys(nodeSelector).length === 0;
  return (
    <>
      <FormSection
        title={
          <Flex>
            <FlexItem>
              {ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.NODE_SELECTORS]}
            </FlexItem>
            {!isEmpty && (
              <FlexItem>
                <Button
                  variant="secondary"
                  onClick={() => setIsNodeSelectorModalOpen(true)}
                  data-testid="add-node-selector-button"
                >
                  Add node selector
                </Button>
              </FlexItem>
            )}
          </Flex>
        }
      >
        Node selectors are added to a pod spec to allow the pod to be scheduled on nodes with
        matching labels.
        {!isEmpty && (
          <NodeSelectorTable
            nodeSelector={nodeSelector}
            onUpdate={(newNodeSelector) => setNodeSelector(newNodeSelector)}
          />
        )}
      </FormSection>
      {isNodeSelectorModalOpen && (
        <ManageNodeSelectorModal
          onClose={() => setIsNodeSelectorModalOpen(false)}
          onSave={(ns) => setNodeSelector({ ...nodeSelector, [ns.key]: ns.value })}
        />
      )}
      {isEmpty && (
        <Button
          isInline
          icon={<AddCircleOIcon />}
          variant="link"
          onClick={() => setIsNodeSelectorModalOpen(true)}
          data-testid="add-node-selector-button"
        >
          Add node selector
        </Button>
      )}
    </>
  );
};

export default ManageNodeSelectorSection;
