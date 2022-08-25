import * as React from 'react';
import { relativeTime } from '../../../../utilities/time';
import { isField, AdminViewUserData } from './types';
import ServerStatus from './ServerStatus';

type TableDataRendererProps = {
  user: AdminViewUserData;
  userProperty: keyof AdminViewUserData;
};

const UserTableCellTransform: React.FC<TableDataRendererProps> = ({ user, userProperty }) => {
  const content: AdminViewUserData[keyof AdminViewUserData] = user[userProperty];

  if (isField<AdminViewUserData['serverStatus']>(content, userProperty === 'serverStatus')) {
    return <ServerStatus username={user.name} data={content} />;
  }

  if (isField<AdminViewUserData['lastActivity']>(content, userProperty === 'lastActivity')) {
    if (!content) return <>Never</>;
    return <>{relativeTime(Date.now(), new Date(content).getTime())}</>;
  }

  return <>{content}</>;
};

export default UserTableCellTransform;
