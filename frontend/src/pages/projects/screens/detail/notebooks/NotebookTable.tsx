import * as React from 'react';
import { TableComposable, Th, Thead, Tr } from '@patternfly/react-table';
import NotebookTableRow from './NotebookTableRow';
import { NotebookState } from '../../../notebook/types';
import { columns } from './data';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';
import { NotebookKind } from '../../../../../k8sTypes';
import DeleteNotebookModal from '../../../notebook/DeleteNotebookModal';
import AddNotebookStorage from '../../../pvc/AddNotebookStorage';

type NotebookTableProps = {
  notebookStates: NotebookState[];
  refresh: () => void;
};

const NotebookTable: React.FC<NotebookTableProps> = ({
  notebookStates: unsortedNotebookStates,
  refresh,
}) => {
  const [addNotebookStorage, setAddNotebookStorage] = React.useState<NotebookKind | undefined>();
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
        {sortedNotebookStates.map((notebookState) => (
          <NotebookTableRow
            key={notebookState.notebook.metadata.uid}
            obj={notebookState}
            onNotebookDelete={setNotebookToDelete}
            onNotebookAddStorage={setAddNotebookStorage}
          />
        ))}
      </TableComposable>
      <AddNotebookStorage
        notebook={addNotebookStorage}
        onClose={(submitted) => {
          if (submitted) {
            refresh();
          }
          setAddNotebookStorage(undefined);
        }}
      />
      <DeleteNotebookModal
        notebook={notebookToDelete}
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setNotebookToDelete(undefined);
        }}
      />
    </>
  );
};

export default NotebookTable;
