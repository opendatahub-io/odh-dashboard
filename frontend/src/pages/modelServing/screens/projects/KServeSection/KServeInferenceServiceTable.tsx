import * as React from 'react';
import { Table } from '~/components/table';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { getKServeInferenceServiceColumns } from '~/pages/modelServing/screens/global/data';
import KServeInferenceServiceTableRow from '~/pages/modelServing/screens/projects/KServeSection/KServeInferenceServiceTableRow';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import ManageKServeModal from '~/pages/modelServing/screens/projects/kServeModal/ManageKServeModal';
import DeleteInferenceServiceModal from '~/pages/modelServing/screens/global/DeleteInferenceServiceModal';

const KServeInferenceServiceTable: React.FC = () => {
  const [editKserveResources, setEditKServeResources] = React.useState<
    | {
        inferenceService: InferenceServiceKind;
        servingRuntime: ServingRuntimeKind;
      }
    | undefined
  >(undefined);
  const [deleteKserveResources, setDeleteKServeResources] = React.useState<
    | {
        inferenceService: InferenceServiceKind;
        servingRuntime: ServingRuntimeKind;
      }
    | undefined
  >(undefined);

  const {
    servingRuntimes: { refresh: refreshServingRuntime },
    dataConnections: { refresh: refreshDataConnections },
    inferenceServices: { data: inferenceServices, refresh: refreshInferenceServices },
  } = React.useContext(ProjectDetailsContext);

  return (
    <>
      <Table
        data={inferenceServices}
        columns={getKServeInferenceServiceColumns()}
        disableRowRenderSupport
        defaultSortColumn={1}
        rowRenderer={(modelServer, rowIndex) => (
          <KServeInferenceServiceTableRow
            key={modelServer.metadata.uid}
            obj={modelServer}
            onEditKServe={(obj) => setEditKServeResources(obj)}
            onDeleteKServe={(obj) => setDeleteKServeResources(obj)}
            rowIndex={rowIndex}
          />
        )}
      />
      <DeleteInferenceServiceModal
        isOpen={!!deleteKserveResources}
        inferenceService={deleteKserveResources?.inferenceService}
        servingRuntime={deleteKserveResources?.servingRuntime}
        onClose={(deleted) => {
          if (deleted) {
            refreshServingRuntime();
            refreshInferenceServices();
          }
          setDeleteKServeResources(undefined);
        }}
      />
      <ManageKServeModal
        isOpen={!!editKserveResources}
        editInfo={{
          servingRuntimeEditInfo: {
            servingRuntime: editKserveResources?.servingRuntime,
            secrets: [],
          },
          inferenceServiceEditInfo: editKserveResources?.inferenceService,
        }}
        onClose={(submit: boolean) => {
          setEditKServeResources(undefined);
          if (submit) {
            refreshServingRuntime();
            refreshInferenceServices();
            refreshDataConnections();
          }
        }}
      />
    </>
  );
};

export default KServeInferenceServiceTable;
