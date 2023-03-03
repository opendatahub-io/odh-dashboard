import * as React from 'react';
import { Alert, Stack, StackItem, Title } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import Table from '~/components/Table';

import useTableColumnSort from '~/utilities/useTableColumnSort';
import ExternalLink from '~/components/ExternalLink';
import ApplicationsPage from '~/pages/ApplicationsPage';
import StopServerModal from '~/pages/notebookController/screens/server/StopServerModal';
import { Notebook } from '~/types';
import { columns } from './const';
import StopAllServersButton from './StopAllServersButton';
import UserTableCellTransform from './UserTableCellTransform';
import useAdminUsers from './useAdminUsers';
import { AdminViewUserData } from './types';
import { NotebookAdminContext } from './NotebookAdminContext';

const NotebookAdminControl: React.FC = () => {
  const [unsortedUsers, loaded, loadError] = useAdminUsers();
  const { transformData } = useTableColumnSort<AdminViewUserData>(columns, 0);
  const { serverStatuses, setServerStatuses } = React.useContext(NotebookAdminContext);

  const users = transformData(unsortedUsers);

  const onNotebooksStop = React.useCallback(
    (didStop: boolean) => {
      if (didStop) {
        serverStatuses.forEach((serverStatus) => {
          serverStatus.forceRefresh();
        });
      }
      setServerStatuses([]);
    },
    [serverStatuses, setServerStatuses],
  );

  const notebooksToStop = React.useMemo(
    () =>
      serverStatuses
        .map((serverStatus) => serverStatus.notebook)
        .filter((notebook): notebook is Notebook => !!notebook),
    [serverStatuses],
  );

  return (
    <div className="odh-notebook-controller__page-content">
      <ApplicationsPage
        title="Administration"
        description="Manage notebook servers."
        provideChildrenPadding
        loaded={loaded}
        loadError={loadError}
        empty={false}
        headerAction={<StopAllServersButton users={users} />}
      >
        <Stack hasGutter>
          <StackItem>
            <Alert title="Manage users in OpenShift" titleHeadingLevel="h2" isInline>
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
            <Table
              aria-label="Users table"
              variant="compact"
              data={users}
              enablePagination
              columns={columns}
              rowRenderer={(user) => (
                <Tr key={user.name}>
                  {columns.map((column) => (
                    <Td
                      key={column.field}
                      dataLabel={column.field}
                      isActionCell={column.field === 'actions'}
                    >
                      <UserTableCellTransform user={user} userProperty={column.field} />
                    </Td>
                  ))}
                </Tr>
              )}
            />
          </StackItem>
        </Stack>
        <StopServerModal notebooksToStop={notebooksToStop} onNotebooksStop={onNotebooksStop} />
      </ApplicationsPage>
    </div>
  );
};

export default NotebookAdminControl;
