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
  ActionsColumn,
} from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';

import './DataProjects.scss';
import { useHistory } from 'react-router-dom';

type DataProjectsTableProps = {
  projects: any;
};

const DataProjectsTable: React.FC<DataProjectsTableProps> = ({ projects }) => {
  const history = useHistory();
  const columns = ['Name', 'Environment', 'Git Repo', 'Created', 'Modified'];
  const [activeSortIndex, setActiveSortIndex] = React.useState<number>();
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc'>();

  const defaultActions = (project): IAction[] => [
    {
      title: 'Details',
      onClick: () => history.push(`data-projects/${project.metadata.name}`),
    },
    {
      title: <a href="#">Link action</a>,
    },
    {
      isSeparator: true,
    },
    {
      title: 'Third action',
      onClick: () => console.log(`clicked on Third action, on row ${project.metadata.name}`),
    },
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
    <TableComposable aria-label="Projects table" variant="compact">
      <Thead noWrap>
        <Tr>
          <Th sort={getSortParams(0)}>{columns[0]}</Th>
          <Th>{columns[1]}</Th>
          <Th>{columns[2]}</Th>
          <Th>{columns[3]}</Th>
          <Th sort={getSortParams(4)}>{columns[4]}</Th>
          <Td></Td>
          <Td></Td>
        </Tr>
      </Thead>
      <Tbody>
        {sortedProjects.map((project, rowIndex) => {
          const rowActions: IAction[] | null = defaultActions(project);
          return (
            <Tr key={rowIndex}>
              <Td dataLabel={columns[0]}>
                <Button
                  isInline
                  variant="link"
                  onClick={() => history.push(`data-projects/${project.metadata.name}`)}
                >
                  {project.metadata.name}
                </Button>
                <div className="pf-u-color-200">{project.metadata.user}</div>
              </Td>
              <Td dataLabel={columns[1]}>
                {project.spec.environments ? (
                  project.spec.environments.map((environment, index) => (
                    <a href="#" key={index} className="odh-data-projects__table-tag">
                      {environment.name}
                    </a>
                  ))
                ) : (
                  <div>Relevant job info</div>
                )}
              </Td>
              <Td dataLabel={columns[2]}>
                {project.spec.gitRepo ? (
                  <a href="#" className="odh-data-projects__table-tag">
                    {project.spec.gitRepo.name}
                  </a>
                ) : (
                  <div>More relevant info</div>
                )}
              </Td>
              <Td dataLabel={columns[3]}>{project.metadata.creationTimestamp}</Td>
              <Td dataLabel={columns[4]}>{project.metadata.modifyTimestamp}</Td>
              <Td>
                <Button isInline variant="link" onClick={() => console.log('do something')}>
                  {project.spec.isProject ? 'Deploy' : 'Action'}
                </Button>
              </Td>
              <Td isActionCell>{rowActions ? <ActionsColumn items={rowActions} /> : null}</Td>
            </Tr>
          );
        })}
      </Tbody>
    </TableComposable>
  );
};

export default DataProjectsTable;
