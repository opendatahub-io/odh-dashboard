import * as React from 'react';
import { Table } from '#~/components/table';
import { HardwareProfileKind, NotebookKind, ProjectKind } from '#~/k8sTypes';
import CanEnableElyraPipelinesCheck from '#~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import ProjectTableRowNotebookTableRow from '#~/pages/projects/screens/projects/ProjectTableRowNotebookTableRow';
import DeleteNotebookModal from '#~/pages/projects/notebook/DeleteNotebookModal';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { FetchStateRefreshPromise } from '#~/utilities/useFetchState';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles.ts';
import { filterHardwareProfileByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility.ts';
import { WORKBENCH_VISIBILITY } from '#~/pages/BYONImages/const.ts';
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

  const [projectHardwareProfiles, projectHardwareProfilesLoaded, projectHardwareProfilesError] =
    useWatchHardwareProfiles(project.metadata.namespace);

  const hardwareProfiles: [HardwareProfileKind[], boolean, Error | undefined] =
    React.useMemo(() => {
      const hardwareProfilesFiltered = filterHardwareProfileByFeatureVisibility(
        projectHardwareProfiles,
        WORKBENCH_VISIBILITY,
      );
      return [
        hardwareProfilesFiltered,
        projectHardwareProfilesLoaded,
        projectHardwareProfilesError,
      ];
    }, [projectHardwareProfiles, projectHardwareProfilesLoaded, projectHardwareProfilesError]);

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
                hardwareProfiles={hardwareProfiles}
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
