import * as React from 'react';

import {
  TableComposable,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  ThProps,
  IAction,
} from '@patternfly/react-table';
import DataProjectsTableRow from './DataProjectsTableRow';
import { useHistory } from 'react-router-dom';
import { Project } from '../../types';

import './DataProjectsTable.scss';

type DataProjectsTableProps = {
  projects: Project[];
  onDelete: any;
};

const DataProjectsTable: React.FC<DataProjectsTableProps> = React.memo(({ projects, onDelete }) => {
  const history = useHistory();
  const columns = ['Name', 'Data science workspace', 'Status', 'Created', 'Serving status'];
  const [activeSortIndex, setActiveSortIndex] = React.useState<number>();
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc'>();

  const defaultActions = (project: Project): IAction[] => [
    {
      title: 'Details',
      onClick: () => history.push(`data-projects/${project.metadata.name}`),
    },
    {
      title: 'Delete',
      onClick: () => onDelete(project),
    },
    // {
    //   isSeparator: true,
    // },
    // {
    //   title: 'Third action',
    //   onClick: () => console.log(`clicked on Third action, on row ${project.metadata.name}`),
    // },
  ];

  const getSortableRowValues = (project): (string | number)[] => {
    const { name, modifyTimestamp } = project.metadata;
    return [name, null, null, null, modifyTimestamp];
  };

  let sortedProjects = projects;
  if (activeSortIndex !== undefined) {
    sortedProjects = projects.sort((a, b) => {
      const aValue = getSortableRowValues(a)[activeSortIndex];
      const bValue = getSortableRowValues(b)[activeSortIndex];
      if (typeof aValue === 'number') {
        // Numeric sort
        if (activeSortDirection === 'asc') {
          return (aValue as number) - (bValue as number);
        }
        return (bValue as number) - (aValue as number);
      } else {
        // String sort
        if (activeSortDirection === 'asc') {
          return (aValue as string).localeCompare(bValue as string);
        }
        return (bValue as string).localeCompare(aValue as string);
      }
    });
  }

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex as number,
      direction: activeSortDirection,
      defaultDirection: 'asc', // starting sort direction when first sorting a column. Defaults to 'asc'
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  return (
    <TableComposable
      className="odh-data-projects__table"
      aria-label="Projects table"
      variant="compact"
    >
      <Thead noWrap>
        <Tr>
          <Th sort={getSortParams(0)}>{columns[0]}</Th>
          <Th>{columns[1]}</Th>
          <Th>{columns[2]}</Th>
          <Th sort={getSortParams(3)}>{columns[3]}</Th>
          <Th>{columns[4]}</Th>
          <Td></Td>
          <Td></Td>
        </Tr>
      </Thead>
      <Tbody>
        {sortedProjects.map((project: Project, rowIndex: number) => {
          const rowActions: IAction[] | null = defaultActions(project);
          return (
            <DataProjectsTableRow
              key={`${project.metadata.name}-row`}
              project={project}
              rowIndex={rowIndex}
              columns={columns}
              rowActions={rowActions}
            />
          );
        })}
      </Tbody>
    </TableComposable>
  );
});

DataProjectsTable.displayName = 'DataProjectsTable';

export default DataProjectsTable;
