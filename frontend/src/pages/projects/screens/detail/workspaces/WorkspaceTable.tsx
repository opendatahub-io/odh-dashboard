import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import WorkspaceTableRow from './WorkspaceTableRow';
import { NotebookState } from '../../../notebook/types';
import { columns } from './data';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';

type NotebookTableProps = {
  notebookStates: NotebookState[];
};

const WorkspaceTable: React.FC<NotebookTableProps> = ({
  notebookStates: unsortedNotebookStates,
}) => {
  const sort = useTableColumnSort<NotebookState>(columns, 1);
  const sortedNotebookStates = sort.transformData(unsortedNotebookStates);

  return (
    <TableComposable variant="compact">
      <Thead>
        <Tr>
          {columns.map((col, i) => (
            <Th key={col.field} sort={sort.getColumnSort(i)} width={col.width}>
              {col.label}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {sortedNotebookStates.map((notebookState) => (
          <WorkspaceTableRow key={notebookState.notebook.metadata.uid} obj={notebookState} />
        ))}
      </Tbody>
    </TableComposable>
  );
};

export default WorkspaceTable;
