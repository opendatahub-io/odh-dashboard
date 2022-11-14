import * as React from 'react';
import { TableComposable, Th, Thead, Tr } from '@patternfly/react-table';
import { columns } from './data';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import { ServingRuntimeKind } from '../../../../k8sTypes';
import ServingRuntimeTableRow from './ServingRuntimeTableRow';
import DeleteServingRuntimeModal from './DeleteServingRuntimeModal';

type ServingRuntimeTableProps = {
  modelServers: ServingRuntimeKind[];
  refresh: () => void;
};

const ServingRuntimeTable: React.FC<ServingRuntimeTableProps> = ({
  modelServers: unsortedModelServers,
  refresh,
}) => {
  const [deleteServingRuntime, setDeleteServingRuntime] = React.useState<ServingRuntimeKind>();
  const sort = useTableColumnSort<ServingRuntimeKind>(columns, 1);
  const sortedModelServers = sort.transformData(unsortedModelServers);

  return (
    <>
      <TableComposable>
        <Thead>
          <Tr>
            {columns.map((col, i) => (
              <Th key={col.field} sort={sort.getColumnSort(i)} width={col.width}>
                {col.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        {sortedModelServers.map((modelServer) => (
          <ServingRuntimeTableRow
            key={modelServer.metadata.uid}
            obj={modelServer}
            onDeleteServingRuntime={(obj) => setDeleteServingRuntime(obj)}
          />
        ))}
      </TableComposable>
      <DeleteServingRuntimeModal
        servingRuntime={deleteServingRuntime}
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setDeleteServingRuntime(undefined);
        }}
      />
    </>
  );
};

export default ServingRuntimeTable;
