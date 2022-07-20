import * as React from 'react';
import { Alert, Stack, StackItem, Title } from '@patternfly/react-core';
import { TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import ApplicationsPage from '../../../ApplicationsPage';
import { columnNames } from './const';
import StopAllServersButton from './StopAllServersButton';
import UserTableCellTransform from './UserTableCellTransform';
import useAdminUsers from './useAdminUsers';
import ExternalLink from '../../../../components/ExternalLink';

const NotebookAdminControl: React.FC = () => {
  const [users, loaded, loadError] = useAdminUsers();

  return (
    <div className="odh-notebook-controller__page-content">
      <ApplicationsPage
        title="Administration"
        description="Manage notebook servers."
        loaded={loaded}
        loadError={loadError}
        empty={false}
        headerAction={<StopAllServersButton users={users} />}
      >
        <div className="odh-notebook-controller__page">
          <Stack hasGutter>
            <StackItem>
              <Alert title="Manage users in OpenShift" isInline>
                Create, delete, and manage permissions for Red Hat OpenShift Data Science users in
                OpenShift.{' '}
                <ExternalLink
                  text="Learn more about OpenShift user management"
                  to="https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html/managing_users_and_user_resources/index"
                />
              </Alert>
            </StackItem>
            <StackItem>
              <Title headingLevel="h2">Users</Title>
            </StackItem>
            <StackItem>
              <TableComposable aria-label="Users table" variant="compact">
                <Thead>
                  <Tr>
                    {columnNames.map((column) => (
                      <Th key={column.name}>{column.name}</Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map((user) => (
                    <Tr key={user.name}>
                      {columnNames.map((column) => (
                        <Td key={column.name} dataLabel={column.name}>
                          <UserTableCellTransform user={user} userProperty={column.field} />
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </TableComposable>
            </StackItem>
          </Stack>
        </div>
      </ApplicationsPage>
    </div>
  );
};

export default NotebookAdminControl;
