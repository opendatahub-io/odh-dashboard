import React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip } from '@patternfly/react-core';
import { ModelRegistryKind, RoleBindingKind } from '~/k8sTypes';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import { ContextResourceData } from '~/types';
import ViewDatabaseConfigModal from './ViewDatabaseConfigModal';
import DeleteModelRegistryModal from './DeleteModelRegistryModal';
import { ModelRegistryTableRowStatus } from './ModelRegistryTableRowStatus';

type ModelRegistriesTableRowProps = {
  modelRegistry: ModelRegistryKind;
  roleBindings: ContextResourceData<RoleBindingKind>;
  refresh: () => Promise<unknown>;
};

const ModelRegistriesTableRow: React.FC<ModelRegistriesTableRowProps> = ({
  modelRegistry: mr,
  roleBindings,
  refresh,
}) => {
  const [isDatabaseConfigModalOpen, setIsDatabaseConfigModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const navigate = useNavigate();
  const filteredRoleBindings = roleBindings.data.filter(
    (rb) =>
      rb.metadata.labels?.['app.kubernetes.io/name'] ===
      (mr.metadata.name || mr.metadata.annotations?.['openshift.io/display-name']),
  );

  return (
    <>
      <Tr>
        <Td dataLabel="Model registry name">
          <ResourceNameTooltip resource={mr}>
            <strong>
              {mr.metadata.annotations?.['openshift.io/display-name'] || mr.metadata.name}
            </strong>
          </ResourceNameTooltip>
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
              onClick={() => navigate(`/modelRegistrySettings/permissions/${mr.metadata.name}`)}
            >
              Manage permissions
            </Button>
          )}
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'View database configuration',
                onClick: () => setIsDatabaseConfigModalOpen(true),
              },
              {
                title: 'Delete model registry',
                onClick: () => setIsDeleteModalOpen(true),
              },
            ]}
          />
        </Td>
      </Tr>
      {isDatabaseConfigModalOpen ? (
        <ViewDatabaseConfigModal
          modelRegistry={mr}
          onClose={() => setIsDatabaseConfigModalOpen(false)}
        />
      ) : null}
      {isDeleteModalOpen ? (
        <DeleteModelRegistryModal
          modelRegistry={mr}
          onClose={() => setIsDeleteModalOpen(false)}
          refresh={refresh}
        />
      ) : null}
    </>
  );
};

export default ModelRegistriesTableRow;
