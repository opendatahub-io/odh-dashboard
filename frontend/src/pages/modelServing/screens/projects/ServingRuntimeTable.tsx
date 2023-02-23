import * as React from 'react';
import { TableComposable, Th, Thead, Tr } from '@patternfly/react-table';
import useTableColumnSort from '~/utilities/useTableColumnSort';
import { SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import { columns } from './data';
import ServingRuntimeTableRow from './ServingRuntimeTableRow';
import DeleteServingRuntimeModal from './DeleteServingRuntimeModal';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ManageInferenceServiceModal from './InferenceServiceModal/ManageInferenceServiceModal';

type ServingRuntimeTableProps = {
  modelServers: ServingRuntimeKind[];
  modelSecrets: SecretKind[];
  refreshServingRuntime: () => void;
  refreshTokens: () => void;
  refreshInferenceServices: () => void;
  expandedColumn?: ServingRuntimeTableTabs;
  updateExpandedColumn: (column?: ServingRuntimeTableTabs) => void;
};

const ServingRuntimeTable: React.FC<ServingRuntimeTableProps> = ({
  modelServers: unsortedModelServers,
  modelSecrets,
  refreshServingRuntime,
  refreshTokens,
  refreshInferenceServices,
  expandedColumn,
  updateExpandedColumn,
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const {
    servingRuntimes: { data: modelServers },
    dataConnections: { data: dataConnections },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

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
            onDeployModal={() => setOpen(true)}
            onExpandColumn={(colIndex?: ServingRuntimeTableTabs) => {
              updateExpandedColumn(expandedColumn === colIndex ? undefined : colIndex);
            }}
            expandedColumn={expandedColumn}
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
      <ManageInferenceServiceModal
        isOpen={isOpen}
        onClose={(submit: boolean) => {
          setOpen(false);
          if (submit) {
            refreshInferenceServices();
          }
        }}
        projectContext={{
          currentProject,
          currentServingRuntime: modelServers[0],
          dataConnections,
        }}
      />
    </>
  );
};

export default ServingRuntimeTable;
