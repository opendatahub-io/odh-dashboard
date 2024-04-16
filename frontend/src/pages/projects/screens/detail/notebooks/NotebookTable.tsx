import * as React from 'react';
import { Table } from '~/components/table';
import { NotebookKind } from '~/k8sTypes';
import DeleteNotebookModal from '~/pages/projects/notebook/DeleteNotebookModal';
import AddNotebookStorage from '~/pages/projects/pvc/AddNotebookStorage';
import { NotebookState } from '~/pages/projects/notebook/types';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ElyraInvalidVersionAlerts } from '~/concepts/pipelines/elyra/ElyraInvalidVersionAlerts';
import NotebookTableRow from './NotebookTableRow';
import { columns } from './data';

type NotebookTableProps = {
  notebookStates: NotebookState[];
  refresh: () => void;
};

const NotebookTable: React.FC<NotebookTableProps> = ({ notebookStates, refresh }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [addNotebookStorage, setAddNotebookStorage] = React.useState<NotebookKind | undefined>();
  const [notebookToDelete, setNotebookToDelete] = React.useState<NotebookKind | undefined>();

  return (
    <>
      <ElyraInvalidVersionAlerts notebooks={notebookStates.map((n) => n.notebook)}>
        {(showImpactedNotebookInfo) => (
          <CanEnableElyraPipelinesCheck namespace={currentProject.metadata.name}>
            {(canEnablePipelines) => (
              <Table
                data-testid="notebook-table"
                variant="compact"
                data={notebookStates}
                columns={columns}
                disableRowRenderSupport
                rowRenderer={(notebookState, i) => (
                  <NotebookTableRow
                    key={notebookState.notebook.metadata.uid}
                    rowIndex={i}
                    obj={notebookState}
                    onNotebookDelete={setNotebookToDelete}
                    onNotebookAddStorage={setAddNotebookStorage}
                    canEnablePipelines={canEnablePipelines}
                    showOutOfDateElyraInfo={showImpactedNotebookInfo(notebookState.notebook)}
                  />
                )}
              />
            )}
          </CanEnableElyraPipelinesCheck>
        )}
      </ElyraInvalidVersionAlerts>
      <AddNotebookStorage
        notebook={addNotebookStorage}
        onClose={(submitted) => {
          if (submitted) {
            refresh();
          }
          setAddNotebookStorage(undefined);
        }}
      />
      <DeleteNotebookModal
        notebook={notebookToDelete}
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setNotebookToDelete(undefined);
        }}
      />
    </>
  );
};

export default NotebookTable;
