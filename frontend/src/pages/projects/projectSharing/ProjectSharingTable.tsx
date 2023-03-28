import * as React from 'react';
import Table from '~/components/Table';
import ProjectSharingTableRow from './ProjectSharingTableRow';
import { columnsProjectSharing } from './data';
import { UserPermission } from './types';

type ProjectSharingTableProps = {
  permissions: UserPermission[];
  refresh: () => void;
};

const ProjectSharingTable: React.FC<ProjectSharingTableProps> = ({ permissions, refresh }) => {
  const [addUserPermission, setAddUserPermission] = React.useState<UserPermission | undefined>();
  const [removeUserPermission, setRemoveUserPermission] = React.useState<UserPermission | undefined>();

  return (
    <>
      <Table
        variant="compact"
        data={permissions}
        columns={columnsProjectSharing}
        disableRowRenderSupport
        rowRenderer={(permissions, i) => (
          <ProjectSharingTableRow
            key={permissions.username}
            rowIndex={i}
            obj={permissions}
            onUserDelete={setRemoveUserPermission}
            onUserAdd={setAddUserPermission}
          />
        )}
      />
      {/* <AddNotebookStorage
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
      /> */}
    </>
  );
};

export default ProjectSharingTable;
