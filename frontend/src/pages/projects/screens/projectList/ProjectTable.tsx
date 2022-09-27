import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import { GetColumnSort } from '../../../../utilities/useTableColumnSort';
import { ProjectKind } from '../../../../k8sTypes';
import ProjectTableRow from './ProjectTableRow';
import { columns } from './tableData';
import ManageProjectModal from './ManageProjectModal';

type ProjectTableProps = {
  projects: ProjectKind[];
  getColumnSort: GetColumnSort;
  refreshProjects: () => Promise<void>;
};

const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  getColumnSort,
  refreshProjects,
}) => {
  const [editData, setEditData] = React.useState<ProjectKind | undefined>();
  const [refreshIds, setRefreshIds] = React.useState<string[]>([]);

  return (
    <>
      <TableComposable>
        <Thead>
          <Tr>
            {columns.map((col, i) => (
              <Th key={col.field} sort={getColumnSort(i)}>
                {col.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {projects.map((project) => (
            <ProjectTableRow
              key={project.metadata.uid}
              obj={project}
              isRefreshing={refreshIds.includes(project.metadata.uid || '')}
              setEditData={(data) => {
                setEditData(data);
              }}
            />
          ))}
        </Tbody>
      </TableComposable>
      <ManageProjectModal
        open={!!editData}
        onClose={() => {
          const refreshId = editData?.metadata.uid;
          if (refreshId) {
            setRefreshIds((otherIds) => [...otherIds, refreshId]);
          }
          setEditData(undefined);

          refreshProjects().then(() =>
            setRefreshIds((ids) => ids.filter((id) => id !== refreshId)),
          );
        }}
        editProjectData={editData}
      />
    </>
  );
};

export default ProjectTable;
