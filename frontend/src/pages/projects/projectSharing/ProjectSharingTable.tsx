import * as React from 'react';
import Table from '~/components/Table';
import ProjectSharingTableRow from './ProjectSharingTableRow';
import { columnsProjectSharing } from './data';
import { RoleBindingKind } from '~/k8sTypes';

type ProjectSharingTableProps = {
  permissions: RoleBindingKind[];
  refresh: () => void;
};

const ProjectSharingTable: React.FC<ProjectSharingTableProps> = ({ permissions, refresh }) => {
  const [addUserPermission, setAddUserPermission] = React.useState<RoleBindingKind | undefined>();
  const [removeUserPermission, setRemoveUserPermission] = React.useState<RoleBindingKind | undefined>();

  return (
    <>
      <Table
        variant="compact"
        data={permissions}
        columns={columnsProjectSharing}
        disableRowRenderSupport
        rowRenderer={(rb, i) => (
          <ProjectSharingTableRow
            key={rb.metadata?.name || ''}
            rowIndex={i}
            obj={rb}
            onEditRoleBinding={setRemoveUserPermission}
            onDeleteRoleBinding={setAddUserPermission}
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
