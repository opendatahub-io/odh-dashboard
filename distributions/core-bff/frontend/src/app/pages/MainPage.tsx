import React, { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { UserIcon } from '@patternfly/react-icons';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import K8sWatchCard from '~/app/components/K8sWatchCard';
import useUser from '~/app/hooks/useUser';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

type BffStatus = { loaded: boolean; error?: string; version?: string };

type K8sNamespace = {
  name: string;
  status: string;
};

type NamespaceState = {
  loaded: boolean;
  error?: string;
  namespaces: K8sNamespace[];
};

const BffStatusAlert: React.FC<{ status: BffStatus }> = ({ status }) => {
  if (status.loaded && status.error) {
    return (
      <Alert variant="danger" isInline title="BFF is not reachable">
        Proxy and WebSocket features require a running BFF. {status.error}
      </Alert>
    );
  }
  if (status.loaded) {
    return (
      <Alert
        variant="success"
        isInline
        title={status.version ? `BFF connected (${status.version})` : 'BFF connected'}
      />
    );
  }
  return <Alert variant="info" isInline title="Checking BFF connectivity..." />;
};

const NamespaceCardBody: React.FC<{
  bffConnected: boolean;
  loaded: boolean;
  error?: string;
  namespaces: K8sNamespace[];
}> = ({ bffConnected, loaded, error, namespaces }) => {
  if (!bffConnected || error) {
    return (
      <Label color="grey" isCompact>
        Unavailable
      </Label>
    );
  }
  if (loaded) {
    return (
      <LabelGroup>
        {namespaces.map((ns) => (
          <Label key={ns.name} color={ns.status === 'Active' ? 'blue' : 'yellow'}>
            {ns.name}
          </Label>
        ))}
      </LabelGroup>
    );
  }
  return <Spinner size="md" />;
};

const MainPage: React.FC = () => {
  const [bffStatus, setBffStatus] = useState<BffStatus>({ loaded: false });
  const [nsState, setNsState] = useState<NamespaceState>({ loaded: false, namespaces: [] });
  const user = useUser();

  useEffect(() => {
    const fetchBffStatus = async () => {
      try {
        const resp = await fetch(`${URL_PREFIX}/api/${BFF_API_VERSION}/healthcheck`);
        if (!resp.ok) {
          setBffStatus({ loaded: true, error: `HTTP ${resp.status}` });
          return;
        }
        const data = await resp.json().catch(() => null);
        setBffStatus({ loaded: true, version: data?.systemInfo?.version });
      } catch (err) {
        setBffStatus({ loaded: true, error: String(err) });
      }
    };
    fetchBffStatus();
  }, []);

  const bffConnected = bffStatus.loaded && !bffStatus.error;

  useEffect(() => {
    if (!bffConnected) {
      return;
    }
    const fetchNamespaces = async () => {
      try {
        const resp = await fetch(`${URL_PREFIX}/api/k8s/api/v1/namespaces`);
        if (!resp.ok) {
          setNsState({ loaded: true, error: `HTTP ${resp.status}`, namespaces: [] });
          return;
        }
        const data = await resp.json();
        const items: K8sNamespace[] = (data.items ?? []).map(
          (item: { metadata?: { name?: string }; status?: { phase?: string } }) => ({
            name: item.metadata?.name ?? 'unknown',
            status: item.status?.phase ?? 'unknown',
          }),
        );
        setNsState({ loaded: true, namespaces: items });
      } catch (err) {
        setNsState({ loaded: true, error: String(err), namespaces: [] });
      }
    };
    fetchNamespaces();
  }, [bffConnected]);

  const clusterReachable = bffConnected && nsState.loaded && !nsState.error;

  return (
    <ApplicationsPage
      title="Core BFF"
      description="Development dashboard for BFF connectivity verification"
      empty={false}
      loaded
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <Stack hasGutter>
        <StackItem>
          <Stack hasGutter>
            <BffStatusAlert status={bffStatus} />
            {bffConnected && nsState.loaded && nsState.error ? (
              <Alert variant="warning" isInline title="Cluster may not be accessible">
                Features that depend on the K8s API will not work without a reachable cluster.
              </Alert>
            ) : null}
          </Stack>
        </StackItem>
        <StackItem>
          <Card isCompact>
            <CardTitle>
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>Session Info</FlexItem>
                <FlexItem>
                  <Label color="purple" isCompact>
                    /api/v1
                  </Label>
                </FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '15ch' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm icon={<UserIcon />}>User</DescriptionListTerm>
                  <DescriptionListDescription>
                    {user.userId || 'Unknown'}
                    {user.clusterAdmin ? (
                      <>
                        {' '}
                        <Label color="green" isCompact>
                          admin
                        </Label>
                      </>
                    ) : null}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </StackItem>
        <StackItem>
          <Card isCompact>
            <CardTitle>
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  Namespaces ({nsState.loaded ? nsState.namespaces.length : '...'})
                </FlexItem>
                <FlexItem>
                  <Label color="teal" isCompact>
                    /api/k8s
                  </Label>
                </FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <NamespaceCardBody
                bffConnected={bffConnected}
                loaded={nsState.loaded}
                error={nsState.error}
                namespaces={nsState.namespaces}
              />
            </CardBody>
          </Card>
        </StackItem>
        <StackItem>
          <K8sWatchCard bffConnected={bffConnected} clusterReachable={clusterReachable} />
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default MainPage;
