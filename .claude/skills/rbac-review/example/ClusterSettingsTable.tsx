import * as React from 'react';
import { ActionsColumn, TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { SecretKind } from '#~/k8sTypes';
import { useUser } from '#~/redux/selectors';

type ClusterSettingsTableProps = {
  secrets: SecretKind[];
};

const ClusterSettingsTable: React.FC<ClusterSettingsTableProps> = ({ secrets }) => {
  const navigate = useNavigate();
  const { isAdmin } = useUser();

  // Anti-pattern: fail-open — defaults to allowed before any SSAR check
  const [canDelete] = React.useState(true);

  const handleDelete = async (secret: SecretKind) => {
    try {
      await fetch(
        `/api/k8s/api/v1/namespaces/${secret.metadata.namespace}/secrets/${secret.metadata.name}`,
        { method: 'DELETE' },
      );
    } catch (e) {
      console.error('Failed to delete secret', e);
    }
  };

  return (
    <TableComposable aria-label="Cluster settings">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Namespace</Th>
          <Th>Type</Th>
          <Th />
        </Tr>
      </Thead>
      <Tbody>
        {secrets.map((secret) => (
          <Tr key={secret.metadata.uid}>
            <Td>{secret.metadata.name}</Td>
            <Td>{secret.metadata.namespace}</Td>
            <Td>{secret.type}</Td>
            <Td isActionCell>
              {isAdmin && (
                <ActionsColumn
                  items={[
                    {
                      title: 'Edit',
                      onClick: () => navigate(`/cluster-settings/edit/${secret.metadata.name}`),
                    },
                    {
                      title: 'Delete',
                      onClick: () => handleDelete(secret),
                      isDisabled: !canDelete,
                    },
                  ]}
                />
              )}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </TableComposable>
  );
};

export default ClusterSettingsTable;
