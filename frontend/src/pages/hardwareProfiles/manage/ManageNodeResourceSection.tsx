import React from 'react';
import { FormSection, Flex, FlexItem, Button, Alert, AlertVariant } from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import { useSearchParams } from 'react-router-dom';
import { Identifier, IdentifierResourceType } from '~/types';
import NodeResourceTable from '~/pages/hardwareProfiles/nodeResource/NodeResourceTable';
import ManageNodeResourceModal from '~/pages/hardwareProfiles/nodeResource/ManageNodeResourceModal';
import { ManageHardwareProfileSectionTitles } from '~/pages/hardwareProfiles/const';
import { ManageHardwareProfileSectionID } from '~/pages/hardwareProfiles/manage/types';
import { EMPTY_IDENTIFIER } from '~/pages/hardwareProfiles/nodeResource/const';

type ManageNodeResourceSectionProps = {
  nodeResources: Identifier[];
  setNodeResources: (identifiers: Identifier[]) => void;
};

const ManageNodeResourceSection: React.FC<ManageNodeResourceSectionProps> = ({
  nodeResources,
  setNodeResources,
}) => {
  const [searchParams] = useSearchParams();

  const nodeResourcesFromSearchURL = React.useMemo(
    () =>
      searchParams
        .get('identifiers')
        ?.split(',')
        .map((identifier) => ({ ...EMPTY_IDENTIFIER, displayName: identifier, identifier })) ?? [],
    [searchParams],
  );

  const [isNodeResourceModalOpen, setIsNodeResourceModalOpen] = React.useState<boolean>(false);
  const isEmpty = nodeResources.length === 0;
  return (
    <>
      <FormSection
        title={
          <Flex>
            <FlexItem>
              {ManageHardwareProfileSectionTitles[ManageHardwareProfileSectionID.IDENTIFIERS]}
            </FlexItem>
            {!isEmpty && (
              <FlexItem>
                <Button
                  variant="secondary"
                  onClick={() => setIsNodeResourceModalOpen(true)}
                  data-testid="add-node-resource-button"
                >
                  Add resource
                </Button>
              </FlexItem>
            )}
          </Flex>
        }
      >
        Every hardware profile is highly recommended to include CPU and memory resources. Additional
        resources, such as GPUs, can be added here, too.
        {!(
          nodeResources.some(
            (identifier) => identifier.resourceType === IdentifierResourceType.CPU,
          ) &&
          nodeResources.some(
            (identifier) => identifier.resourceType === IdentifierResourceType.MEMORY,
          )
        ) && (
          <Alert
            title="Missing CPU or Memory node resources"
            isInline
            variant={AlertVariant.warning}
            data-testid="node-resource-table-alert"
          >
            It is not recommended to remove the CPU or Memory. The resources that use this hardware
            profile will schedule, but will be very unstable due to not having any lower or upper
            resource bounds.
          </Alert>
        )}
        {!isEmpty && (
          <NodeResourceTable
            nodeResources={[...nodeResources, ...nodeResourcesFromSearchURL]}
            onUpdate={(newResources) => setNodeResources(newResources)}
          />
        )}
      </FormSection>
      {isNodeResourceModalOpen && (
        <ManageNodeResourceModal
          onClose={() => setIsNodeResourceModalOpen(false)}
          onSave={(identifier) => setNodeResources([...nodeResources, identifier])}
          nodeResources={nodeResources}
        />
      )}
      {isEmpty && (
        <Button
          isInline
          icon={<AddCircleOIcon />}
          variant="link"
          onClick={() => setIsNodeResourceModalOpen(true)}
          data-testid="add-node-resource-button"
        >
          Add node resource
        </Button>
      )}
    </>
  );
};

export default ManageNodeResourceSection;
