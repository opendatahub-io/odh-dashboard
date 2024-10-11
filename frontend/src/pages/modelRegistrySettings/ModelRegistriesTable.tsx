import React from 'react';
import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { Table } from '~/components/table';
import { ModelRegistryKind, RoleBindingKind } from '~/k8sTypes';
import { ContextResourceData } from '~/types';
import { modelRegistryColumns } from './columns';
import ModelRegistriesTableRow from './ModelRegistriesTableRow';

type ModelRegistriesTableProps = {
  modelRegistries: ModelRegistryKind[];
  refresh: () => Promise<unknown>;
  roleBindings: ContextResourceData<RoleBindingKind>;
  onCreateModelRegistryClick: () => void;
};

const ModelRegistriesTable: React.FC<ModelRegistriesTableProps> = ({
  modelRegistries,
  roleBindings,
  refresh,
  onCreateModelRegistryClick,
}) => (
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
        refresh={refresh}
      />
    )}
    variant="compact"
  />
);

export default ModelRegistriesTable;
