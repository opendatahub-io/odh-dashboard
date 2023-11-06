import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { Table } from '~/components/table';
import AcceleratorProfilesTableRow from '~/pages/acceleratorProfiles/screens/list/AcceleratorProfilesTableRow';
import { AcceleratorKind } from '~/k8sTypes';
import { columns } from '~/pages/acceleratorProfiles/screens/list/const';

type AcceleratorProfilesTableProps = {
  accelerators: AcceleratorKind[];
};

const AcceleratorProfilesTable: React.FC<AcceleratorProfilesTableProps> = ({ accelerators }) => {
  const navigate = useNavigate();

  return (
    <Table
      id="accelerator-profile-table"
      enablePagination
      data={accelerators}
      columns={columns}
      emptyTableView={'No projects match your filters.'}
      rowRenderer={(accelerator) => (
        <AcceleratorProfilesTableRow key={accelerator.metadata.name} accelerator={accelerator} />
      )}
      toolbarContent={
        <ToolbarItem>
          <Button
            data-id="create-accelerator-profile"
            onClick={() => navigate(`/acceleratorProfiles/create`)}
          >
            Create accelerator profile
          </Button>
        </ToolbarItem>
      }
    />
  );
};

export default AcceleratorProfilesTable;
