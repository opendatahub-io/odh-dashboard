import * as React from 'react';
import { TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { GetColumnSort } from '~/utilities/useTableColumnSort';
import { ProjectKind } from '~/k8sTypes';
import ProjectTableRow from './ProjectTableRow';
import { columns } from './tableData';
import ManageProjectModal from './ManageProjectModal';
import DeleteProjectModal from './DeleteProjectModal';

type ProjectTableProps = {
  clearFilters: () => void;
  projects: ProjectKind[];
  getColumnSort: GetColumnSort;
  refreshProjects: () => Promise<void>;
};

const ProjectTable: React.FC<ProjectTableProps> = ({
  clearFilters,
  projects,
  getColumnSort,
  refreshProjects,
}) => {
  const [deleteData, setDeleteData] = React.useState<ProjectKind | undefined>();
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
          {projects.length === 0 && (
            <Tr>
              <Td colSpan={columns.length} style={{ textAlign: 'center' }}>
                No projects match your filters.{' '}
                <Button variant="link" isInline onClick={clearFilters}>
                  Clear filters
                </Button>
              </Td>
            </Tr>
          )}
          {projects.map((project) => (
            <ProjectTableRow
              key={project.metadata.uid}
              obj={project}
              isRefreshing={refreshIds.includes(project.metadata.uid || '')}
              setEditData={(data) => setEditData(data)}
              setDeleteData={(data) => setDeleteData(data)}
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

          refreshProjects()
            .then(() => setRefreshIds((ids) => ids.filter((id) => id !== refreshId)))
            /* eslint-disable-next-line no-console */
            .catch((e) => console.error('Failed refresh', e));
        }}
        editProjectData={editData}
      />
      <DeleteProjectModal
        deleteData={deleteData}
        onClose={(deleted) => {
          setDeleteData(undefined);
          if (deleted) {
            /* eslint-disable-next-line no-console */
            refreshProjects().catch((e) => console.error('Failed refresh', e));
          }
        }}
      />
    </>
  );
};

export default ProjectTable;
