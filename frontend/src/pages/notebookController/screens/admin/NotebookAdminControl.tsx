import * as React from 'react';
import {
  Alert,
  Pagination,
  PaginationVariant,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import ApplicationsPage from '../../../ApplicationsPage';
import { columns } from './const';
import StopAllServersButton from './StopAllServersButton';
import UserTableCellTransform from './UserTableCellTransform';
import useAdminUsers from './useAdminUsers';
import ExternalLink from '../../../../components/ExternalLink';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import { AdminViewUserData } from './types';
import StopServerModal from '../server/StopServerModal';
import { NotebookAdminContext } from './NotebookAdminContext';
import { Notebook } from '../../../../types';

const INITIAL_PAGE_LIMIT = 10;
const NotebookAdminControl: React.FC = () => {
  const [unsortedUsers, loaded, loadError] = useAdminUsers();
  const [pageIndex, setPageIndex] = React.useState(0);
  const [perPage, setPerPage] = React.useState(INITIAL_PAGE_LIMIT);
  const { transformData, getColumnSort } = useTableColumnSort<AdminViewUserData>(columns, 0);
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
                    {columns.map((column, i) => (
                      <Th key={column.field} sort={getColumnSort(i)}>
                        {column.label}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {users.slice(perPage * pageIndex, perPage * pageIndex + perPage).map((user) => (
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
                  ))}
                </Tbody>
              </TableComposable>
              {users.length > INITIAL_PAGE_LIMIT && (
                <Pagination
                  itemCount={users.length}
                  perPage={perPage}
                  page={pageIndex + 1}
                  variant={PaginationVariant.bottom}
                  onSetPage={(e, pageNumber) => setPageIndex(pageNumber - 1)}
                  onPerPageSelect={(e, newPerPage) => setPerPage(newPerPage)}
                />
              )}
            </StackItem>
          </Stack>
        </div>
        <StopServerModal
          impersonatedUsername={undefined}
          notebooksToStop={notebooksToStop}
          onNotebooksStop={onNotebooksStop}
        />
      </ApplicationsPage>
    </div>
  );
};

export default NotebookAdminControl;
