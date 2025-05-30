import * as React from 'react';
import { Table } from '#~/components/table';
import { NotebookKind, ProjectKind } from '#~/k8sTypes';
import CanEnableElyraPipelinesCheck from '#~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import ProjectTableRowNotebookTableRow from '#~/pages/projects/screens/projects/ProjectTableRowNotebookTableRow';
import DeleteNotebookModal from '#~/pages/projects/notebook/DeleteNotebookModal';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { FetchStateRefreshPromise } from '#~/utilities/useFetchState';
import { columns } from './notebookTableData';

type ProjectTableRowNotebookTableProps = {
  notebookStates: NotebookState[];
  obj: ProjectKind;
  refresh: FetchStateRefreshPromise<NotebookState[]>;
};
const ProjectTableRowNotebookTable: React.FC<ProjectTableRowNotebookTableProps> = ({
  notebookStates,
  obj: project,
  refresh,
}) => {
  const [notebookToDelete, setNotebookToDelete] = React.useState<NotebookKind | undefined>();

  return (
    <CanEnableElyraPipelinesCheck namespace={project.metadata.name}>
      {(enablePipelines) => (
        <>
          <Table
            className="odh-project-table-row--notebook-table"
            variant="compact"
            defaultSortColumn={0}
            data={notebookStates}
            columns={columns}
            data-testid="project-notebooks-table"
            rowRenderer={(notebookState) => (
              <ProjectTableRowNotebookTableRow
                key={notebookState.notebook.metadata.name}
                obj={notebookState}
                project={project}
                enablePipelines={enablePipelines}
                onNotebookDelete={setNotebookToDelete}
              />
            )}
          />
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
      )}
    </CanEnableElyraPipelinesCheck>
  );
};

export default ProjectTableRowNotebookTable;
