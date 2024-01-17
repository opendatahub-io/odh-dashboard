import * as React from 'react';
import { Table } from '~/components/table';
import { NotebookKind, ProjectKind } from '~/k8sTypes';
import DeleteNotebookModal from '~/pages/projects/notebook/DeleteNotebookModal';
import AddNotebookStorage from '~/pages/projects/pvc/AddNotebookStorage';
import { NotebookState } from '~/pages/projects/notebook/types';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import NotebookTableRow from './NotebookTableRow';
import { columns, compactColumns } from './data';

type NotebookTableProps = {
  notebookStates: NotebookState[];
  refresh?: () => void;
  project?: ProjectKind;
  compact?: boolean;
};

const NotebookTable: React.FC<NotebookTableProps> = ({
  notebookStates,
  refresh,
  compact,
  project,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [addNotebookStorage, setAddNotebookStorage] = React.useState<NotebookKind | undefined>();
  const [notebookToDelete, setNotebookToDelete] = React.useState<NotebookKind | undefined>();

  return (
    <>
      <CanEnableElyraPipelinesCheck namespace={(project || currentProject).metadata.name}>
        {(canEnablePipelines) => (
          <Table
            variant="compact"
            data={notebookStates}
            columns={compact ? compactColumns : columns}
            disableRowRenderSupport
            rowRenderer={(notebookState, i) => (
              <NotebookTableRow
                key={notebookState.notebook.metadata.uid}
                rowIndex={i}
                obj={notebookState}
                onNotebookDelete={setNotebookToDelete}
                onNotebookAddStorage={setAddNotebookStorage}
                canEnablePipelines={canEnablePipelines}
                compact={compact}
              />
            )}
          />
        )}
      </CanEnableElyraPipelinesCheck>
      {!compact ? (
        <>
          <AddNotebookStorage
            notebook={addNotebookStorage}
            onClose={(submitted) => {
              if (submitted) {
                refresh && refresh();
              }
              setAddNotebookStorage(undefined);
            }}
          />
          <DeleteNotebookModal
            notebook={notebookToDelete}
            onClose={(deleted) => {
              if (deleted) {
                refresh && refresh();
              }
              setNotebookToDelete(undefined);
            }}
          />
        </>
      ) : null}
    </>
  );
};

export default NotebookTable;
