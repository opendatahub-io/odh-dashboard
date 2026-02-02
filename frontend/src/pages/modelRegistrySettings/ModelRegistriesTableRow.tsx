import React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, FlexItem, Label, Popover, Tooltip } from '@patternfly/react-core';
import { BellIcon, InfoCircleIcon } from '@patternfly/react-icons';
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
                headerContent={
                  <>
                    <BellIcon
                      className="pf-v6-u-mr-sm"
                      color="var(--pf-t--global--icon--color--status--info--default)"
                    />
                    No project permission
                  </>
                }
                bodyContent={
                  <>
                    To enable model storage and allow access from workbenches, you must grant access
                    to at least one project.
                    <br />
                    Click <strong>Manage permissions</strong> and add the relevant projects in the{' '}
                    <strong>Projects</strong> tab.
                  </>
                }
              >
                <Label
                  status="info"
                  icon={<InfoCircleIcon />}
                  data-testid="mr-no-project-permission-label"
                  isClickable
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
