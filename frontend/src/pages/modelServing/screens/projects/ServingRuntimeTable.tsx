import * as React from 'react';
import { TableComposable, Th, Thead, Tr } from '@patternfly/react-table';
import { columns } from './data';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import { SecretKind, ServingRuntimeKind } from '../../../../k8sTypes';
import ServingRuntimeTableRow from './ServingRuntimeTableRow';
import DeleteServingRuntimeModal from './DeleteServingRuntimeModal';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';

type ServingRuntimeTableProps = {
  modelServers: ServingRuntimeKind[];
  modelSecrets: SecretKind[];
  refreshServingRuntime: () => void;
  refreshTokens: () => void;
  refreshInferenceServices: () => void;
};

const ServingRuntimeTable: React.FC<ServingRuntimeTableProps> = ({
  modelServers: unsortedModelServers,
  modelSecrets,
  refreshServingRuntime,
  refreshTokens,
  refreshInferenceServices,
}) => {
  const [deleteServingRuntime, setDeleteServingRuntime] = React.useState<ServingRuntimeKind>();
  const [editServingRuntime, setEditServingRuntime] = React.useState<ServingRuntimeKind>();
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
            onEditServingRuntime={(obj) => setEditServingRuntime(obj)}
          />
        ))}
      </TableComposable>
      <DeleteServingRuntimeModal
        servingRuntime={deleteServingRuntime}
        onClose={(deleted) => {
          if (deleted) {
            refreshServingRuntime();
          }
          setDeleteServingRuntime(undefined);
        }}
      />
      <ManageServingRuntimeModal
        isOpen={editServingRuntime !== undefined}
        editInfo={{
          servingRuntime: editServingRuntime,
          secrets: modelSecrets,
        }}
        onClose={(submit: boolean) => {
          setEditServingRuntime(undefined);
          if (submit) {
            refreshServingRuntime();
            refreshInferenceServices();
            setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
          }
        }}
      />
    </>
  );
};

export default ServingRuntimeTable;
