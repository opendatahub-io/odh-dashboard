import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import { GetColumnSort } from '../../../../utilities/useTableColumnSort';
import { ProjectKind } from '../../../../k8sTypes';
import ProjectTableRow from './ProjectTableRow';
import { columns } from './tableData';

type ProjectTableProps = {
  projects: ProjectKind[];
  getColumnSort: GetColumnSort;
};

const ProjectTable: React.FC<ProjectTableProps> = ({ projects, getColumnSort }) => {
  return (
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
          <ProjectTableRow key={project.metadata.uid} obj={project} />
        ))}
      </Tbody>
    </TableComposable>
  );
};

export default ProjectTable;
