import React from 'react';
import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { Table } from '~/components/table';
import { ModelRegistryKind, RoleBindingKind } from '~/k8sTypes';
import { FetchStateObject } from '~/utilities/useFetch';
import { modelRegistryColumns } from './columns';
import ModelRegistriesTableRow from './ModelRegistriesTableRow';
import DeleteModelRegistryModal from './DeleteModelRegistryModal';
import CreateModal from './CreateModal';

type ModelRegistriesTableProps = {
  modelRegistries: ModelRegistryKind[];
  refresh: () => Promise<unknown>;
  roleBindings: FetchStateObject<RoleBindingKind[]>;
  onCreateModelRegistryClick: () => void;
};

const ModelRegistriesTable: React.FC<ModelRegistriesTableProps> = ({
  modelRegistries,
  roleBindings,
  refresh,
  onCreateModelRegistryClick,
}) => {
  const [editRegistry, setEditRegistry] = React.useState<ModelRegistryKind>();
  const [deleteRegistry, setDeleteRegistry] = React.useState<ModelRegistryKind>();
  return (
    <>
      <Table
        data-testid="model-registries-table"
        data={modelRegistries}
        columns={modelRegistryColumns}
        toolbarContent={
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Button
                  data-testid="create-model-registry-button"
                  variant="primary"
                  onClick={onCreateModelRegistryClick}
                >
                  Create model registry
                </Button>
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        }
        rowRenderer={(mr) => (
          <ModelRegistriesTableRow
            key={mr.metadata.name}
            modelRegistry={mr}
            roleBindings={roleBindings}
            onEditRegistry={(i) => setEditRegistry(i)}
            onDeleteRegistry={(i) => setDeleteRegistry(i)}
          />
        )}
        variant="compact"
      />
      {editRegistry ? (
        <CreateModal
          modelRegistry={editRegistry}
          onClose={() => setEditRegistry(undefined)}
          refresh={refresh}
        />
      ) : null}
      {deleteRegistry ? (
        <DeleteModelRegistryModal
          modelRegistry={deleteRegistry}
          onClose={() => setDeleteRegistry(undefined)}
          refresh={refresh}
        />
      ) : null}
    </>
  );
};

export default ModelRegistriesTable;
