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
import { useHistory } from 'react-router-dom';
import { Project } from '../../types';

import './DataProjects.scss';

type DataProjectsTableProps = {
  projects: Project[];
  onDelete: any;
};

const DataProjectsTable: React.FC<DataProjectsTableProps> = React.memo(({ projects, onDelete }) => {
  const history = useHistory();
  const columns = ['Name', 'Environment', 'Status', 'Created', 'Services'];
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
    <TableComposable aria-label="Projects table" variant="compact">
      <Thead noWrap>
        <Tr>
          <Th sort={getSortParams(0)}>{columns[0]}</Th>
          {/*<Th>{columns[1]}</Th>*/}
          <Th>{columns[2]}</Th>
          <Th sort={getSortParams(3)}>{columns[3]}</Th>
          {/*<Th sort={getSortParams(4)}>{columns[4]}</Th>*/}
          <Td></Td>
          <Td></Td>
        </Tr>
      </Thead>
      <Tbody>
        {sortedProjects.map((project: Project, rowIndex: number) => {
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
                <div className="pf-u-color-200">
                  {project.metadata.labels?.['opendatahub.io/user']}
                </div>
              </Td>
              {/*<Td dataLabel={columns[1]}>*/}
              {/*  {project.spec.environments ? (*/}
              {/*    project.spec.environments.map((environment, index) => (*/}
              {/*      <a href="#" key={index} className="odh-data-projects__table-tag">*/}
              {/*        {environment.name}*/}
              {/*      </a>*/}
              {/*    ))*/}
              {/*  ) : (*/}
              {/*    <div>Relevant job info</div>*/}
              {/*  )}*/}
              {/*</Td>*/}
              {/*<Td dataLabel={columns[2]}>*/}
              {/*  {project.spec.gitRepo ? (*/}
              {/*    <a href="#" className="odh-data-projects__table-tag">*/}
              {/*      {project.spec.gitRepo.name}*/}
              {/*    </a>*/}
              {/*  ) : (*/}
              {/*    <div>More relevant info</div>*/}
              {/*  )}*/}
              {/*</Td>*/}
              <Td dataLabel={columns[2]}>{project.status.phase}</Td>
              <Td dataLabel={columns[3]}>{project.metadata.creationTimestamp}</Td>
              {/*<Td dataLabel={columns[4]}>{project.metadata.modifyTimestamp}</Td>*/}
              <Td>
                <Button isInline variant="link" onClick={() => console.log('do something')}>
                  Deploy
                </Button>
              </Td>
              <Td isActionCell>{rowActions ? <ActionsColumn items={rowActions} /> : null}</Td>
            </Tr>
          );
        })}
      </Tbody>
    </TableComposable>
  );
});

DataProjectsTable.displayName = 'DataProjectsTable';

export default DataProjectsTable;
