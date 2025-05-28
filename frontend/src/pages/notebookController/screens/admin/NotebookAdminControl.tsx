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
import { Notebook } from '#~/types';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';
import { useUser } from '#~/redux/selectors';
import useNotification from '#~/utilities/useNotification';
import { stopWorkbenches } from '#~/pages/notebookController/utils';
import { StopAdminWorkbenchModalProps } from '#~/pages/projects/screens/detail/notebooks/types';
import { columns } from './data';
import StopAllServersButton from './StopAllServersButton';
import UserTableCellTransform from './UserTableCellTransform';
import useAdminUsers from './useAdminUsers';
import { NotebookAdminContext } from './NotebookAdminContext';
import { ServerStatus } from './types';

const NotebookAdminControl: React.FC = () => {
  const [users, loaded, loadError] = useAdminUsers();
  const { serverStatuses, setServerStatuses } = React.useContext(NotebookAdminContext);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const [showModal, setShowModal] = React.useState(!dontShowModalValue);
  const { isAdmin } = useUser();
  const notification = useNotification();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const onNotebooksStop = React.useCallback(
    (didStop: boolean, serverStatusesArr?: ServerStatus[]) => {
      if (didStop) {
        (serverStatusesArr ?? serverStatuses).forEach((serverStatus) => {
          serverStatus.forceRefresh();
        });
      }
      setShowModal(false);
      setServerStatuses([]);
    },
    [serverStatuses, setServerStatuses],
  );

  const getNotebooksToStop = (serverStatusesArr: ServerStatus[]) =>
    serverStatusesArr
      .map((serverStatus) => serverStatus.notebook)
      .filter((notebook): notebook is Notebook => !!notebook);

  const notebooksToStop = React.useMemo(() => getNotebooksToStop(serverStatuses), [serverStatuses]);

  const handleStopWorkbenches = React.useCallback(
    (serverStatusesArr: ServerStatus[]) => {
      const stoppedWorkbenches = getNotebooksToStop(serverStatusesArr);
      setIsDeleting(true);
      stopWorkbenches(stoppedWorkbenches, isAdmin)
        .then(() => {
          setIsDeleting(false);
          onNotebooksStop(true, serverStatusesArr);
          setShowModal(false);
        })
        .catch((e) => {
          setIsDeleting(false);
          notification.error(
            `Error stopping workbench${stoppedWorkbenches.length > 1 ? 's' : ''}`,
            e.message,
          );
        });
    },
    [isAdmin, notification, onNotebooksStop],
  );

  const onStop = React.useCallback(
    (activeServers: ServerStatus[]) => {
      setServerStatuses(activeServers);
      if (dontShowModalValue) {
        handleStopWorkbenches(activeServers);
      } else {
        setShowModal(true);
      }
    },
    [dontShowModalValue, handleStopWorkbenches, setServerStatuses],
  );

  const stopAdminWorkbenchModalProps: StopAdminWorkbenchModalProps = {
    notebooksToStop,
    isDeleting,
    showModal,
    link: '#',
    handleStopWorkbenches,
    onNotebooksStop,
    onStop,
  };

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
      headerAction={
        <StopAllServersButton
          users={users}
          stopAdminWorkbenchModalProps={stopAdminWorkbenchModalProps}
        />
      }
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
                    <UserTableCellTransform
                      user={user}
                      userProperty={column.field}
                      stopAdminWorkbenchModalProps={stopAdminWorkbenchModalProps}
                    />
                  </Td>
                ))}
              </Tr>
            )}
          />
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default NotebookAdminControl;
