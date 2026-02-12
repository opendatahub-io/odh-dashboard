import React from 'react';
import {
  Alert,
  Button,
  List,
  ListItem,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table } from '#~/components/table';
import { ModelRegistryKind, RoleBindingKind } from '#~/k8sTypes';
import { FetchStateObject } from '#~/utilities/useFetch';
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
      <Stack hasGutter>
        <StackItem>
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
        </StackItem>
        <StackItem>
          <Alert
            isExpandable
            isInline
            variant="info"
            title="Configuration guide: Grant UI access, connect workbenches, and setup model storage"
            data-testid="mr-settings-configuration-guide-alert"
          >
            <List>
              <ListItem>
                To grant users access to the model registry UI, click{' '}
                <strong>Manage permissions</strong> and add users or groups in the{' '}
                <strong>Users</strong> tab.
              </ListItem>
              <ListItem>
                To enable model storage that relies on project-scoped transfer jobs, or to access
                this registry from workbenches within a specific project, click{' '}
                <strong>Manage permissions</strong> and add the relevant projects in the{' '}
                <strong>Projects</strong> tab.
              </ListItem>
            </List>
          </Alert>
        </StackItem>
        <StackItem>
          <Table
            data-testid="model-registries-table"
            data={modelRegistries}
            columns={modelRegistryColumns}
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
        </StackItem>
      </Stack>
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
