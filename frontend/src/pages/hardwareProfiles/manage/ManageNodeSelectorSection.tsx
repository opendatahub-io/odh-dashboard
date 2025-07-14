import React from 'react';
import { Button, FormGroup } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import { NodeSelector } from '#~/types';
import ManageNodeSelectorModal from '#~/pages/hardwareProfiles/nodeSelector/ManageNodeSelectorModal';
import NodeSelectorTable from '#~/pages/hardwareProfiles/nodeSelector/NodeSelectorTable';
import { ManageHardwareProfileSectionTitles } from '#~/pages/hardwareProfiles/const';
import { ManageHardwareProfileSectionID } from '#~/pages/hardwareProfiles/manage/types';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip.tsx';
import { HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP } from '#~/pages/hardwareProfiles/nodeResource/const.ts';

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
      <FormGroup
        isInline
        label={ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.NODE_SELECTORS]}
        fieldId={ManageHardwareProfileSectionID.NODE_SELECTORS}
        labelHelp={
          <DashboardHelpTooltip content={HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP.nodeSelectors} />
        }
      >
        {!isEmpty && (
          <Button
            variant="secondary"
            onClick={() => setIsNodeSelectorModalOpen(true)}
            data-testid="add-node-selector-button"
          >
            Add node selector
          </Button>
        )}
        {!isEmpty && (
          <NodeSelectorTable
            nodeSelector={nodeSelector}
            onUpdate={(newNodeSelector) => setNodeSelector(newNodeSelector)}
          />
        )}
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
      </FormGroup>
    </>
  );
};

export default ManageNodeSelectorSection;
