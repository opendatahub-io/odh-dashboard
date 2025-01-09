import * as React from 'react';
import { Table } from '~/components/table';
import { NotebookKind } from '~/k8sTypes';
import DeleteNotebookModal from '~/pages/projects/notebook/DeleteNotebookModal';
import { NotebookState } from '~/pages/projects/notebook/types';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ElyraInvalidVersionAlerts } from '~/concepts/pipelines/elyra/ElyraInvalidVersionAlerts';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import NotebookTableRow from './NotebookTableRow';
import { getColumns } from './data';

type NotebookTableProps = {
  notebookStates: NotebookState[];
  refresh: () => void;
};

const NotebookTable: React.FC<NotebookTableProps> = ({ notebookStates, refresh }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { projects } = React.useContext(ProjectsContext);
  const [notebookToDelete, setNotebookToDelete] = React.useState<NotebookKind | undefined>();

  const columns = React.useMemo(
    () => getColumns(projects, currentProject.metadata.name),
    [projects, currentProject.metadata.name],
  );

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
                    canEnablePipelines={canEnablePipelines}
                    showOutOfDateElyraInfo={showImpactedNotebookInfo(notebookState.notebook)}
                  />
                )}
              />
            )}
          </CanEnableElyraPipelinesCheck>
        )}
      </ElyraInvalidVersionAlerts>
      {notebookToDelete ? (
        <DeleteNotebookModal
          notebook={notebookToDelete}
          onClose={(deleted) => {
            if (deleted) {
              refresh();
            }
            setNotebookToDelete(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default NotebookTable;
