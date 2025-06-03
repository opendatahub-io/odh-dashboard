import * as React from 'react';
import {
  Alert,
  EmptyState,
  EmptyStateVariant,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { Table } from '#~/components/table';
import ExternalLink from '#~/components/ExternalLink';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import useRouteForNotebook from '#~/pages/projects/notebook/useRouteForNotebook.ts';
import { columns } from './data';
import StopAllServersButton from './StopAllServersButton';
import UserTableCellTransform from './UserTableCellTransform';
import useAdminUsers from './useAdminUsers';

const NotebookAdminControl: React.FC = () => {
  const [users, loaded, loadError] = useAdminUsers();
  const { serverStatuses, setServerStatuses } = React.useContext(NotebookAdminContext);
  const [selectedNotebook, setSelectedNotebook] = React.useState<Notebook | undefined>(undefined);
  const [currentNotebookLink, currentNotebookLinkLoaded, currentNotebookLinkError] =
    useRouteForNotebook(selectedNotebook?.metadata.name, selectedNotebook?.metadata.namespace);

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

  React.useEffect(() => {
    if (notebooksToStop.length === 1) {
      setSelectedNotebook(notebooksToStop[0]);
    } else {
      setSelectedNotebook(undefined);
    }
  }, [notebooksToStop]);

  return (
    <ApplicationsPage
      title="Administration"
      description="Manage workbenches for your organization."
      provideChildrenPadding
      loaded={loaded}
      loadingContent={
        <EmptyState
          headingLevel="h1"
          titleText="Loading"
          variant={EmptyStateVariant.lg}
          data-id="loading-empty-state"
        >
          <Spinner size="xl" />
        </EmptyState>
      }
      loadError={loadError}
      empty={false}
      headerAction={<StopAllServersButton users={users} />}
    >
      <Stack hasGutter>
        <StackItem>
          <Alert
            title="Manage users in OpenShift"
            component="h2"
            isInline
            data-testid="manage-users-alert"
          >
            Create, delete, and manage permissions for {ODH_PRODUCT_NAME} users in OpenShift.{' '}
            <ExternalLink
              text="Learn more about OpenShift user management"
              to="https://docs.redhat.com/en/documentation/red_hat_openshift_ai_cloud_service/1/html/managing_openshift_ai/managing-users-and-groups"
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
            data-testid="administration-users-table"
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
      {(currentNotebookLinkLoaded && notebooksToStop.length === 1) || notebooksToStop.length > 1 ? (
        <StopServerModal
          notebooksToStop={notebooksToStop}
          onNotebooksStop={onNotebooksStop}
          link={currentNotebookLinkError || !currentNotebookLink ? '#' : currentNotebookLink}
        />
      ) : null}
    </ApplicationsPage>
  );
};

export default NotebookAdminControl;
