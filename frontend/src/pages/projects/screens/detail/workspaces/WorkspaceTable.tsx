import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import WorkspaceTableRow from './WorkspaceTableRow';
import { NotebookState } from '../../../notebook/types';
import { columns } from './data';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';
import { NotebookKind } from '../../../../../k8sTypes';
import DeleteNotebookModal from '../../../notebook/DeleteNotebookModal';

type NotebookTableProps = {
  notebookStates: NotebookState[];
  refreshNotebooks: () => void;
};

const WorkspaceTable: React.FC<NotebookTableProps> = ({
  notebookStates: unsortedNotebookStates,
  refreshNotebooks,
}) => {
  const [notebookToDelete, setNotebookToDelete] = React.useState<NotebookKind | undefined>();
  const sort = useTableColumnSort<NotebookState>(columns, 1);
  const sortedNotebookStates = sort.transformData(unsortedNotebookStates);

  return (
    <>
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
            <WorkspaceTableRow
              key={notebookState.notebook.metadata.uid}
              obj={notebookState}
              onNotebookDelete={setNotebookToDelete}
            />
          ))}
        </Tbody>
      </TableComposable>
      <DeleteNotebookModal
        notebook={notebookToDelete}
        onClose={() => {
          setNotebookToDelete(undefined);
          refreshNotebooks();
        }}
      />
    </>
  );
};

export default WorkspaceTable;
