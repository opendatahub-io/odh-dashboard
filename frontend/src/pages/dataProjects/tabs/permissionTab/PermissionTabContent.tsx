import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import PermissionList from './PermissionList';
import { PermissionType } from '../../../../types';

//type PermissionTabContentProps = {};

const description =
  'Add users that can access the project. Read only users will be able to view details of your project, but not make any changes. Edit users will be able to view and make changes to the project.';

const PermissionTabContent: React.FC = React.memo(() => {
  const [users, setUsers] = React.useState([
    { name: 'test-user-1', permission: PermissionType.View },
    { name: 'test-user-2', permission: PermissionType.View },
  ]);
  const [groups, setGroups] = React.useState([
    { name: 'test-group-1', permission: PermissionType.Edit },
    { name: 'test-group-2', permission: PermissionType.View },
  ]);
  return (
    <PageSection>
      <div>{description}</div>
      <PermissionList type="user" data={users} setData={setUsers} />
      <PermissionList type="group" data={groups} setData={setGroups} />
    </PageSection>
  );
});

PermissionTabContent.displayName = 'PermissionTabContent';

export default PermissionTabContent;
