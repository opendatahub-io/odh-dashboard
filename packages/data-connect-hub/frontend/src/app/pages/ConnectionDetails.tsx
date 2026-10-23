import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Label,
  MenuToggle,
  PageSection,
  Skeleton,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { EllipsisVIcon, InProgressIcon } from '@patternfly/react-icons';
import { t_global_icon_color_status_info_default as InfoIconColor } from '@patternfly/react-tokens';
import HeaderIcon from '@odh-dashboard/ui-core/design/HeaderIcon';
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { verifyConnection } from '~/app/api/dch';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import ConnectionDeleteModal from '~/app/components/ConnectionDeleteModal';
import RelativeTimestamp from '~/app/components/RelativeTimestamp';
import { useConnection } from '~/app/hooks/useConnection';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import {
  DATA_CONNECT_HUB_EVENT_NAMES,
  fireDataConnectHubTrackEvent,
  getConnectionTypeProvider,
} from '~/app/utilities/tracking';
import {
  hasVerificationOutcome,
  isValidTimestamp,
  statusVariant,
} from '~/app/utilities/connectionStatus';

type ConnectionDetailsContentProps = {
  namespace: string;
};

const ConnectionDetailsContent: React.FC<ConnectionDetailsContentProps> = ({ namespace }) => {
  const { connectionId = '' } = useParams<'connectionId'>();
  const { search } = useLocation();
  const [namespaces] = useNamespaces();
  const [connection, loaded, loadError, refresh] = useConnection(namespace, connectionId);
  const [verifying, setVerifying] = React.useState(false);
  const [verificationError, setVerificationError] = React.useState<Error>();
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const verificationOperationRef = React.useRef(0);
  const navigate = useNavigate();
  const connectionsPath = { pathname: '..', search };
  const projectDisplayName = React.useMemo(
    () => namespaces.find((item) => item.name === namespace)?.displayName ?? namespace,
    [namespace, namespaces],
  );
  const loadingSkeleton = <Skeleton screenreaderText="Loading connection" />;
  const connectionName = connection?.resource.name ?? loadingSkeleton;
  const hasValidTimestamp = isValidTimestamp(connection?.status.updated_at);
  const testedConnection =
    connection && hasValidTimestamp && hasVerificationOutcome(connection) ? connection : undefined;
  const properties = Object.entries(connection?.resource.properties ?? {});
  const connectionTypeId = connection?.resource.data_connection_type_id ?? '';
  const [connectionType] = useConnectionType(
    namespace,
    connectionTypeId,
    Boolean(connectionTypeId),
  );
  const connectionTypeName = connectionType?.resource.name ?? connectionTypeId;

  React.useEffect(
    () => () => {
      verificationOperationRef.current += 1;
    },
    [],
  );

  const handleVerify = async () => {
    if (!connection || verifying) {
      return;
    }

    setVerifying(true);
    setVerificationError(undefined);
    const operation = ++verificationOperationRef.current;
    try {
      await verifyConnection('')({}, namespace, connection.metadata.id);
    } catch (failure) {
      if (verificationOperationRef.current !== operation) {
        return;
      }
      setVerificationError(
        failure instanceof Error ? failure : new Error('Unable to verify connection'),
      );
    } finally {
      if (verificationOperationRef.current === operation) {
        await refresh();
        if (verificationOperationRef.current === operation) {
          setVerifying(false);
        }
      }
    }
  };

  return (
    <ApplicationsPage
      title={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <HeaderIcon type={ProjectObjectType.connections} />
          </FlexItem>
          <FlexItem>{connectionName}</FlexItem>
          <FlexItem>
            <Label color="grey" data-testid="connection-label">
              Connection
            </Label>
          </FlexItem>
        </Flex>
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={connectionsPath} relative="path">
              Connections - {projectDisplayName}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{connectionName}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      loadError={loadError}
      errorMessage="Unable to load connection"
      empty={loaded && !connection}
      emptyMessage="Connection not found"
      headerAction={
        connection && (
          <Dropdown
            isOpen={actionsOpen}
            onOpenChange={setActionsOpen}
            popperProps={{ placement: 'bottom-end' }}
            toggle={(ref) => (
              <MenuToggle
                ref={ref}
                variant="plain"
                aria-label={`Actions for ${connection.resource.name}`}
                data-testid="connection-actions-toggle"
                onClick={() => setActionsOpen((open) => !open)}
              >
                <EllipsisVIcon />
              </MenuToggle>
            )}
          >
            <DropdownList>
              <DropdownItem
                isDisabled={verifying}
                onClick={() => {
                  setActionsOpen(false);
                  void handleVerify();
                }}
              >
                Verify connection
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setActionsOpen(false);
                  fireDataConnectHubTrackEvent({
                    eventName: DATA_CONNECT_HUB_EVENT_NAMES.deleteInitiated,
                    properties: {
                      project: namespace,
                      connectionTypeProvider:
                        getConnectionTypeProvider(connectionType) ?? 'unknown',
                    },
                  });
                  setDeleteOpen(true);
                }}
              >
                Delete
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        )
      }
    >
      <PageSection isFilled data-testid="connection-details" data-connection-id={connectionId}>
        <Grid hasGutter>
          <GridItem lg={8} md={12}>
            <Stack hasGutter>
              <StackItem>
                <Card data-testid="connection-details-card">
                  <CardTitle>Connection details</CardTitle>
                  <CardBody>
                    <DescriptionList columnModifier={{ default: '2Col' }} isCompact isFillColumns>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Name</DescriptionListTerm>
                        <DescriptionListDescription>{connectionName}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Type</DescriptionListTerm>
                        <DescriptionListDescription>
                          {connectionTypeName}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Created</DescriptionListTerm>
                        <DescriptionListDescription>
                          <RelativeTimestamp datetime={connection?.metadata.created_at ?? ''} />
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Last modified</DescriptionListTerm>
                        <DescriptionListDescription>
                          <RelativeTimestamp datetime={connection?.metadata.updated_at ?? ''} />
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Card>
              </StackItem>
              {properties.length > 0 && (
                <StackItem>
                  <Card data-testid="connection-properties-card">
                    <CardTitle>Properties</CardTitle>
                    <CardBody>
                      <DescriptionList columnModifier={{ default: '2Col' }} isCompact isFillColumns>
                        {properties.map(([key, value]) => (
                          <DescriptionListGroup key={key}>
                            <DescriptionListTerm>{key}</DescriptionListTerm>
                            <DescriptionListDescription>{value}</DescriptionListDescription>
                          </DescriptionListGroup>
                        ))}
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </StackItem>
              )}
            </Stack>
          </GridItem>
          <GridItem lg={4} md={12}>
            <Card data-testid="connection-verification-card">
              <CardTitle>Verification status</CardTitle>
              <CardBody>
                <DescriptionList isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Status</DescriptionListTerm>
                    <DescriptionListDescription data-testid="connection-status-label">
                      {verifying ? (
                        <Label
                          color="blue"
                          variant="outline"
                          icon={<InProgressIcon color={InfoIconColor.var} className="ai-u-spin" />}
                        >
                          Verifying
                        </Label>
                      ) : testedConnection ? (
                        <Label
                          variant="outline"
                          status={statusVariant[testedConnection.status.state]}
                        >
                          {testedConnection.status.state === 'ready'
                            ? 'Verified'
                            : 'Verification failed'}
                        </Label>
                      ) : (
                        <Label variant="outline" color="grey">
                          Unverified
                        </Label>
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Last tested</DescriptionListTerm>
                    <DescriptionListDescription data-testid="connection-last-tested">
                      {testedConnection?.status.updated_at ? (
                        <RelativeTimestamp datetime={testedConnection.status.updated_at} />
                      ) : (
                        '-'
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
              <CardBody>
                <Button
                  variant="link"
                  data-testid="connection-verify-button"
                  isDisabled={!connection || verifying}
                  onClick={() => void handleVerify()}
                >
                  Verify connection
                </Button>
                {verificationError && (
                  <HelperText>
                    <HelperTextItem variant="error">{verificationError.message}</HelperTextItem>
                  </HelperText>
                )}
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
      {deleteOpen && connection && (
        <ConnectionDeleteModal
          key={`${namespace}:${connection.metadata.id}`}
          connection={connection}
          namespace={namespace}
          onClose={() => setDeleteOpen(false)}
          onSuccess={() => navigate(connectionsPath, { relative: 'path', replace: true })}
        />
      )}
    </ApplicationsPage>
  );
};

const ConnectionDetails: React.FC = () => {
  const { search } = useLocation();
  const [searchParams] = useSearchParams();
  const { connectionId = '' } = useParams<'connectionId'>();
  const namespace = searchParams.get('project');

  if (namespace) {
    return <ConnectionDetailsContent key={`${namespace}:${connectionId}`} namespace={namespace} />;
  }

  return <Navigate to={{ pathname: '..', search }} relative="path" replace />;
};

export default ConnectionDetails;
