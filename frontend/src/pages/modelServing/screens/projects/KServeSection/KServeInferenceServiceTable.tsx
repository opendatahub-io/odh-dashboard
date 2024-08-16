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
    dataConnections: { refresh: refreshDataConnections },
    inferenceServices: { data: inferenceServices, refresh: refreshInferenceServices },
    serverSecrets: { refresh: refreshServerSecrets },
    filterTokens,
  } = React.useContext(ProjectDetailsContext);
  const columns = getKServeInferenceServiceColumns();

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
            key={modelServer.metadata.uid}
            obj={modelServer}
            columnNames={columns.map((column) => column.field)}
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
          secrets: filterTokens(editKserveResources?.inferenceService.metadata.name),
        }}
        onClose={(submit: boolean) => {
          setEditKServeResources(undefined);
          if (submit) {
            refreshServingRuntime();
            refreshInferenceServices();
            refreshDataConnections();
            refreshServerSecrets();
          }
        }}
      />
    </>
  );
};

export default KServeInferenceServiceTable;
