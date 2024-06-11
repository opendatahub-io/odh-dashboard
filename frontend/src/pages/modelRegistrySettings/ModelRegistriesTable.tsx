import React from 'react';
import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { Table } from '~/components/table';
import { ModelRegistryKind } from '~/k8sTypes';
import { modelRegistryColumns } from './columns';
import ModelRegistriesTableRow from './ModelRegistriesTableRow';

type ModelRegistriesTableProps = {
  modelRegistries: ModelRegistryKind[];
  refresh: () => Promise<unknown>;
  onCreateModelRegistryClick: () => void;
};

const ModelRegistriesTable: React.FC<ModelRegistriesTableProps> = ({
  modelRegistries,
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
      <ModelRegistriesTableRow key={mr.metadata.name} modelRegistry={mr} refresh={refresh} />
    )}
    variant="compact"
  />
);

export default ModelRegistriesTable;
