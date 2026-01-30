import React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, FlexItem, Label, Popover, Tooltip } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { ModelRegistryKind, RoleBindingKind } from '#~/k8sTypes';
import { FetchStateObject } from '#~/utilities/useFetch';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import { filterRoleBindingSubjects } from '#~/concepts/roleBinding/utils';
import { RoleBindingPermissionsRBType } from '#~/concepts/roleBinding/types';
import { ModelRegistryTableRowStatus } from './ModelRegistryTableRowStatus';

type ModelRegistriesTableRowProps = {
  modelRegistry: ModelRegistryKind;
  roleBindings: FetchStateObject<RoleBindingKind[]>;
  onEditRegistry: (obj: ModelRegistryKind) => void;
  onDeleteRegistry: (obj: ModelRegistryKind) => void;
};

const ModelRegistriesTableRow: React.FC<ModelRegistriesTableRowProps> = ({
  modelRegistry: mr,
  roleBindings,
  onEditRegistry,
  onDeleteRegistry,
}) => {
  const navigate = useNavigate();
  const filteredRoleBindings = roleBindings.data.filter(
    (rb) =>
      rb.metadata.labels?.['app.kubernetes.io/name'] ===
      (mr.metadata.name || mr.metadata.annotations?.['openshift.io/display-name']),
  );

  const hasProjectPermissions =
    filterRoleBindingSubjects(
      filteredRoleBindings,
      RoleBindingPermissionsRBType.GROUP,
      true, // isProjectSubject
    ).length > 0;
  const showNoProjectPermissionLabel = !hasProjectPermissions;

  return (
    <Tr>
      <Td dataLabel="Model registry name">
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <ResourceNameTooltip resource={mr}>
              <strong>
                {mr.metadata.annotations?.['openshift.io/display-name'] || mr.metadata.name}
              </strong>
            </ResourceNameTooltip>
          </FlexItem>
          {showNoProjectPermissionLabel && (
            <FlexItem>
              <Popover
                headerContent="No project permission"
                bodyContent="To enable users to store models during registration using a project-scoped batch job, grant the relevant project access to the registry. To manage access, click Manage permissions."
              >
                <Label
                  status="info"
                  icon={<InfoCircleIcon />}
                  data-testid="mr-no-project-permission-label"
                >
                  No project permission
                </Label>
              </Popover>
            </FlexItem>
          )}
        </Flex>
        {mr.metadata.annotations?.['openshift.io/description'] && (
          <p>{mr.metadata.annotations['openshift.io/description']}</p>
        )}
      </Td>
      <Td dataLabel="Status">
        <ModelRegistryTableRowStatus conditions={mr.status?.conditions} />
      </Td>
      <Td modifier="fitContent">
        {filteredRoleBindings.length === 0 ? (
          <Tooltip content="You can manage permissions when the model registry becomes available.">
            <Button isAriaDisabled variant="link">
              Manage permissions
            </Button>
          </Tooltip>
        ) : (
          <Button
            variant="link"
            onClick={() =>
              navigate(
                `/settings/model-resources-operations/model-registry/permissions/${mr.metadata.name}`,
              )
            }
          >
            Manage permissions
          </Button>
        )}
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit model registry',
              onClick: () => {
                onEditRegistry(mr);
              },
            },
            {
              title: 'Delete model registry',
              onClick: () => {
                onDeleteRegistry(mr);
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default ModelRegistriesTableRow;
