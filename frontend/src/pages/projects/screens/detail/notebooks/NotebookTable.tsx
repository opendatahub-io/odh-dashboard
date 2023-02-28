import * as React from 'react';
import Table from '~/components/Table';

import { NotebookKind } from '~/k8sTypes';
import DeleteNotebookModal from '~/pages/projects/notebook/DeleteNotebookModal';
import AddNotebookStorage from '~/pages/projects/pvc/AddNotebookStorage';
import { NotebookState } from '~/pages/projects/notebook/types';
import NotebookTableRow from './NotebookTableRow';
import { columns } from './data';

type NotebookTableProps = {
  notebookStates: NotebookState[];
  refresh: () => void;
};

const NotebookTable: React.FC<NotebookTableProps> = ({ notebookStates, refresh }) => {
  const [addNotebookStorage, setAddNotebookStorage] = React.useState<NotebookKind | undefined>();
  const [notebookToDelete, setNotebookToDelete] = React.useState<NotebookKind | undefined>();

  return (
    <>
      <Table
        variant="compact"
        data={notebookStates}
        columns={columns}
        disableRowRenderSupport
        rowRenderer={(notebookState, i) => (
          <NotebookTableRow
            key={notebookState.notebook.metadata.uid}
            rowIndex={i}
            obj={notebookState}
            onNotebookDelete={setNotebookToDelete}
            onNotebookAddStorage={setAddNotebookStorage}
          />
        )}
      />
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
