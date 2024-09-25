import * as React from 'react';
import { Table } from '~/components/table';
import { NotebookKind, ProjectKind } from '~/k8sTypes';
import { useNotebooksStates } from '~/pages/projects/notebook/useNotebooksStates';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import ProjectTableRowNotebookTableRow from '~/pages/projects/screens/projects/ProjectTableRowNotebookTableRow';
import DeleteNotebookModal from '~/pages/projects/notebook/DeleteNotebookModal';
import { columns } from './notebookTableData';

type ProjectTableRowNotebookTableProps = {
  notebooks: NotebookKind[];
  obj: ProjectKind;
};
const ProjectTableRowNotebookTable: React.FC<ProjectTableRowNotebookTableProps> = ({
  notebooks,
  obj: project,
}) => {
  const [notebookStates, loaded, , refresh] = useNotebooksStates(notebooks, project.metadata.name);
  const [notebookToDelete, setNotebookToDelete] = React.useState<NotebookKind | undefined>();

  return (
    <CanEnableElyraPipelinesCheck namespace={project.metadata.name}>
      {(enablePipelines) => (
        <>
          <Table
            className="odh-project-table-row--notebook-table"
            loading={!loaded}
            skeletonRowCount={notebooks.length}
            skeletonRowProps={{ style: { border: 'none' } }}
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
