import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Table } from '#~/components/table';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { getKServeInferenceServiceColumns } from '#~/pages/modelServing/screens/global/data';
import KServeInferenceServiceTableRow from '#~/pages/modelServing/screens/projects/KServeSection/KServeInferenceServiceTableRow';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import ManageKServeModal from '#~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import DeleteInferenceServiceModal from '#~/pages/modelServing/screens/global/DeleteInferenceServiceModal';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import ManageNIMServingModal from '#~/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';

const KServeInferenceServiceTable: React.FC = () => {
  const { projects } = React.useContext(ProjectsContext);
  const { namespace } = useParams<{ namespace: string }>();
  const project = projects.find(byName(namespace));
  const isKServeNIMEnabled = !!project && isProjectNIMSupported(project);
  const [editKserveResources, setEditKServeResources] = React.useState<
    | {
        inferenceService: InferenceServiceKind;
        servingRuntime?: ServingRuntimeKind;
      }
    | undefined
  >(undefined);
  const [deleteKserveResources, setDeleteKServeResources] = React.useState<
    | {
        inferenceService: InferenceServiceKind;
        servingRuntime?: ServingRuntimeKind;
      }
    | undefined
  >(undefined);

  const {
    servingRuntimes: { refresh: refreshServingRuntime },
    connections: { refresh: refreshConnections },
    inferenceServices: {
      data: { items: inferenceServices },
      refresh: refreshInferenceServices,
    },
    serverSecrets: { refresh: refreshServerSecrets },
    filterTokens,
  } = React.useContext(ProjectDetailsContext);
  const columns = getKServeInferenceServiceColumns();

  const KServeManageModalComponent = isKServeNIMEnabled ? ManageNIMServingModal : ManageKServeModal;

  return (
    <>
      <Table
        data={inferenceServices}
        data-testid="kserve-inference-service-table"
        columns={columns}
        disableRowRenderSupport
        defaultSortColumn={1}
        rowRenderer={(modelServer, rowIndex) => (
          <KServeInferenceServiceTableRow
            project={project?.metadata.name}
            key={modelServer.metadata.uid}
            obj={modelServer}
            columnNames={columns.map((column) => column.field)}
            onEditKServe={(obj) => setEditKServeResources(obj)}
            onDeleteKServe={(obj) => setDeleteKServeResources(obj)}
            rowIndex={rowIndex}
          />
        )}
      />
      {deleteKserveResources ? (
        <DeleteInferenceServiceModal
          inferenceService={deleteKserveResources.inferenceService}
          servingRuntime={deleteKserveResources.servingRuntime}
          onClose={(deleted) => {
            fireFormTrackingEvent('Model Deleted', {
              outcome: deleted ? TrackingOutcome.submit : TrackingOutcome.cancel,
              type: 'single',
            });
            if (deleted) {
              refreshServingRuntime();
              refreshInferenceServices();
            }
            setDeleteKServeResources(undefined);
          }}
        />
      ) : null}
      {editKserveResources ? (
        <KServeManageModalComponent
          editInfo={{
            servingRuntimeEditInfo: {
              servingRuntime: editKserveResources.servingRuntime,
              secrets: [],
            },
            inferenceServiceEditInfo: editKserveResources.inferenceService,
            secrets: filterTokens(
              editKserveResources.inferenceService.spec.predictor.model?.runtime,
            ),
          }}
          onClose={(submit: boolean) => {
            setEditKServeResources(undefined);
            if (submit) {
              refreshServingRuntime();
              refreshInferenceServices();
              refreshConnections();
              refreshServerSecrets();
            }
          }}
        />
      ) : null}
    </>
  );
};

export default KServeInferenceServiceTable;
