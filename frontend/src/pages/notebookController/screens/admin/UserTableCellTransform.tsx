import * as React from 'react';
import { relativeTime } from '#~/utilities/time';
import { isField, AdminViewUserData } from './types';
import ServerStatus from './ServerStatus';
import NotebookActions from './NotebookActions';

type TableDataRendererProps = {
  user: AdminViewUserData;
  userProperty: string; //keyof AdminViewUserData;
};

const UserTableCellTransform: React.FC<TableDataRendererProps> = ({ user, userProperty }) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const content = user[userProperty as keyof AdminViewUserData];

  if (isField<AdminViewUserData['serverStatus']>(content, userProperty === 'serverStatus')) {
    return <ServerStatus username={user.name} data={content} />;
  }

  if (isField<AdminViewUserData['actions']>(content, userProperty === 'actions')) {
    return <NotebookActions data={content} />;
  }

  if (isField<AdminViewUserData['lastActivity']>(content, userProperty === 'lastActivity')) {
    if (!content) {
      return <>Never</>;
    }
    return <>{relativeTime(Date.now(), new Date(content).getTime())}</>;
  }

  return <>{content}</>;
};

export default UserTableCellTransform;
