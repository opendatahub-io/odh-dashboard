import * as React from 'react';
import Table from '~/components/table/Table';
import useTableColumnSort from '~/components/table/useTableColumnSort';
import { ServingRuntimeKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { columns } from './data';
import ServingRuntimeTableRow from './ServingRuntimeTableRow';
import DeleteServingRuntimeModal from './DeleteServingRuntimeModal';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ManageInferenceServiceModal from './InferenceServiceModal/ManageInferenceServiceModal';

type ServingRuntimeTableProps = {
  modelServers: ServingRuntimeKind[];
  refreshServingRuntime: () => void;
  refreshTokens: () => void;
  refreshInferenceServices: () => void;
};

const ServingRuntimeTable: React.FC<ServingRuntimeTableProps> = ({
  modelServers: unsortedModelServers,
  refreshServingRuntime,
  refreshTokens,
  refreshInferenceServices,
}) => {
  const [deployServingRuntime, setDeployServingRuntime] = React.useState<ServingRuntimeKind>();
  const [deleteServingRuntime, setDeleteServingRuntime] = React.useState<ServingRuntimeKind>();
  const [editServingRuntime, setEditServingRuntime] = React.useState<ServingRuntimeKind>();

  const {
    dataConnections: { data: dataConnections },
    inferenceServices: { data: inferenceServices },
    filterTokens,
    currentProject,
  } = React.useContext(ProjectDetailsContext);
  const sort = useTableColumnSort<ServingRuntimeKind>(columns, 1);

  const sortedModelServers = sort.transformData(unsortedModelServers);

  return (
    <>
      <Table
        data={sortedModelServers}
        columns={columns}
        disableRowRenderSupport
        rowRenderer={(modelServer) => (
          <ServingRuntimeTableRow
            key={modelServer.metadata.uid}
            obj={modelServer}
            onDeleteServingRuntime={(obj) => setDeleteServingRuntime(obj)}
            onEditServingRuntime={(obj) => setEditServingRuntime(obj)}
            onDeployModal={(obj) => setDeployServingRuntime(obj)}
          />
        )}
      />
      <DeleteServingRuntimeModal
        servingRuntime={deleteServingRuntime}
        tokens={filterTokens(deleteServingRuntime?.metadata.name)}
        inferenceServices={inferenceServices}
        onClose={(deleted) => {
          if (deleted) {
            refreshServingRuntime();
          }
          setDeleteServingRuntime(undefined);
        }}
      />
      <ManageServingRuntimeModal
        isOpen={editServingRuntime !== undefined}
        currentProject={currentProject}
        editInfo={{
          servingRuntime: editServingRuntime,
          secrets: filterTokens(editServingRuntime?.metadata.name),
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
      {deployServingRuntime && (
        <ManageInferenceServiceModal
          isOpen={!!deployServingRuntime}
          onClose={(submit: boolean) => {
            setDeployServingRuntime(undefined);
            if (submit) {
              refreshInferenceServices();
            }
          }}
          projectContext={{
            currentProject,
            currentServingRuntime: deployServingRuntime,
            dataConnections,
          }}
        />
      )}
    </>
  );
};

export default ServingRuntimeTable;
