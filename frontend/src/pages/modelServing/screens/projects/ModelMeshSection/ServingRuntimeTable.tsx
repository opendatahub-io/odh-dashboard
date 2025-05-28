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
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';

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
    servingRuntimes: {
      data: { items: modelServers },
      refresh: refreshServingRuntime,
    },
    serverSecrets: { refresh: refreshTokens },
    connections: { data: connections, refresh: refreshConnections },
    inferenceServices: {
      data: { items: inferenceServices },
      refresh: refreshInferenceServices,
    },
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
        variant="compact"
        data-testid="serving-runtime-table"
        data={modelServers}
        columns={columns}
        disableRowRenderSupport
        defaultSortColumn={1}
        rowRenderer={(modelServer) => (
          <ServingRuntimeTableRow
            key={modelServer.metadata.uid}
            obj={modelServer}
            onDeleteServingRuntime={(obj) => setDeleteServingRuntime(obj)}
            onEditServingRuntime={(obj) => setEditServingRuntime(obj)}
            onDeployModel={(obj) => setDeployServingRuntime(obj)}
            expandedServingRuntimeName={expandedServingRuntimeName}
            allowDelete={allowDelete}
          />
        )}
      />
      {allowDelete && deleteServingRuntime ? (
        <DeleteServingRuntimeModal
          servingRuntime={deleteServingRuntime}
          inferenceServices={inferenceServices}
          onClose={(deleted) => {
            fireFormTrackingEvent('Model Server Deleted', {
              outcome: deleted ? TrackingOutcome.submit : TrackingOutcome.cancel,
            });
            if (deleted) {
              refreshServingRuntime();
            }
            setDeleteServingRuntime(undefined);
          }}
        />
      ) : null}
      {editServingRuntime ? (
        <ManageServingRuntimeModal
          currentProject={currentProject}
          editInfo={{
            servingRuntime: editServingRuntime,
            secrets: filterTokens(editServingRuntime.metadata.name),
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
      ) : null}
      {deployServingRuntime && (
        <ManageInferenceServiceModal
          onClose={(submit: boolean) => {
            setDeployServingRuntime(undefined);
            if (submit) {
              refreshInferenceServices();
              refreshConnections();
              setExpandedServingRuntimeName(deployServingRuntime.metadata.name);
            }
            fireFormTrackingEvent('Model Deployed', {
              outcome: submit ? TrackingOutcome.submit : TrackingOutcome.cancel,
              type: 'multi',
            });
          }}
          projectContext={{
            currentProject,
            currentServingRuntime: deployServingRuntime,
            connections,
          }}
        />
      )}
    </>
  );
};

export default ServingRuntimeTable;
