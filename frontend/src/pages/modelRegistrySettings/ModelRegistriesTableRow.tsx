import React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { ModelRegistryKind } from '~/k8sTypes';
import ManagePermissionsModal from './ManagePermissionsModal';
import ViewDatabaseConfigModal from './ViewDatabaseConfigModal';
import DeleteModelRegistryModal from './DeleteModelRegistryModal';

type ModelRegistriesTableRowProps = {
  modelRegistry: ModelRegistryKind;
  refresh: () => Promise<unknown>;
};

const ModelRegistriesTableRow: React.FC<ModelRegistriesTableRowProps> = ({
  modelRegistry: mr,
  refresh,
}) => {
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = React.useState(false);
  const [isDatabaseConfigModalOpen, setIsDatabaseConfigModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  return (
    <>
      <Tr>
        <Td dataLabel="Model registry name">{mr.metadata.name}</Td>
        <Td modifier="fitContent">
          <Button
            variant="link"
            onClick={() => setIsPermissionsModalOpen(true)}
            aria-label={`Manage permissions for model registry ${mr.metadata.name}`}
          >
            Manage permissions
          </Button>
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
      <ManagePermissionsModal
        modelRegistry={mr}
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        refresh={refresh}
      />
      <ViewDatabaseConfigModal
        modelRegistry={mr}
        isOpen={isDatabaseConfigModalOpen}
        onClose={() => setIsDatabaseConfigModalOpen(false)}
      />
      <DeleteModelRegistryModal
        modelRegistry={mr}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        refresh={refresh}
      />
    </>
  );
};

export default ModelRegistriesTableRow;
