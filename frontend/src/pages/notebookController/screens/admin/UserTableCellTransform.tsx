import * as React from 'react';
import { relativeTime } from '../../../../utilities/time';
import { isField, User } from './types';
import ServerStatus from './ServerStatus';

type TableDataRendererProps = {
  user: User;
  userProperty: keyof User;
};

const UserTableCellTransform: React.FC<TableDataRendererProps> = ({ user, userProperty }) => {
  const content: User[keyof User] = user[userProperty];

  if (isField<User['serverStatus']>(content, userProperty === 'serverStatus')) {
    return <ServerStatus username={user.name} data={content} />;
  }

  if (isField<User['lastActivity']>(content, userProperty === 'lastActivity')) {
    if (!content) return <>Never</>;
    return <>{relativeTime(Date.now(), content)}</>;
  }

  return <>{content}</>;
};

export default UserTableCellTransform;
