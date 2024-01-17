import * as React from 'react';
import { Table } from '~/components/table';
import { AccessReviewResourceAttributes, ServingRuntimeKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { columns } from '~/pages/modelServing/screens/projects/data';
import ServingRuntimeTableRow from '~/pages/modelServing/screens/projects/ModelMeshSection/ServingRuntimeTableRow';
import DeleteServingRuntimeModal from '~/pages/modelServing/screens/projects/ServingRuntimeModal/DeleteServingRuntimeModal';
import ManageServingRuntimeModal from '~/pages/modelServing/screens/projects/ServingRuntimeModal/ManageServingRuntimeModal';
import ManageInferenceServiceModal from '~/pages/modelServing/screens/projects/InferenceServiceModal/ManageInferenceServiceModal';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'delete',
};

const ServingRuntimeTable: React.FC = () => {
  const [deployServingRuntime, setDeployServingRuntime] = React.useState<ServingRuntimeKind>();
  const [deleteServingRuntime, setDeleteServingRuntime] = React.useState<ServingRuntimeKind>();
  const [editServingRuntime, setEditServingRuntime] = React.useState<ServingRuntimeKind>();
  const [expandedServingRuntimeName, setExpandedServingRuntimeName] = React.useState<string>();

  const {
    servingRuntimes: { data: modelServers, refresh: refreshServingRuntime },
    serverSecrets: { refresh: refreshTokens },
    dataConnections: { data: dataConnections, refresh: refreshDataConnections },
    inferenceServices: { data: inferenceServices, refresh: refreshInferenceServices },
    filterTokens,
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const namespace = currentProject.metadata.name;

  const [allowDelete] = useAccessReview({
    ...accessReviewResource,
    namespace,
  });

  return (
    <>
      <Table
        data={modelServers}
        columns={columns}
        disableRowRenderSupport
        defaultSortColumn={1}
        rowRenderer={(modelServer, rowIndex) => (
          <ServingRuntimeTableRow
            key={modelServer.metadata.uid}
            obj={modelServer}
            rowIndex={rowIndex}
            onDeleteServingRuntime={(obj) => setDeleteServingRuntime(obj)}
            onEditServingRuntime={(obj) => setEditServingRuntime(obj)}
            onDeployModel={(obj) => setDeployServingRuntime(obj)}
            expandedServingRuntimeName={expandedServingRuntimeName}
            allowDelete={allowDelete}
          />
        )}
      />
      {allowDelete && (
        <DeleteServingRuntimeModal
          servingRuntime={deleteServingRuntime}
          inferenceServices={inferenceServices}
          onClose={(deleted) => {
            if (deleted) {
              refreshServingRuntime();
            }
            setDeleteServingRuntime(undefined);
          }}
        />
      )}
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
              refreshDataConnections();
              setExpandedServingRuntimeName(deployServingRuntime.metadata.name);
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
