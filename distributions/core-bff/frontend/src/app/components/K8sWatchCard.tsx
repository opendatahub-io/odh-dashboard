import React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  CubesIcon,
  PluggedIcon,
  UnpluggedIcon,
  PlusCircleIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import { URL_PREFIX } from '~/app/utilities/const';

type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type WatchEvent = {
  type: string;
  name: string;
  timestamp: string;
};

const WS_CONNECT_TIMEOUT = 10_000;
const NAMESPACE = 'opendatahub';
const CM_PATH = `/api/k8s/api/v1/namespaces/${NAMESPACE}/configmaps`;
const DEMO_LABEL = 'app.kubernetes.io/created-by';
const DEMO_LABEL_VALUE = 'watch-demo';
const WS_WATCH_PARAMS = new URLSearchParams({
  watch: 'true',
  labelSelector: `${DEMO_LABEL}=${DEMO_LABEL_VALUE}`,
});
const WS_WATCH_PATH = `/wss/k8s/api/v1/namespaces/${NAMESPACE}/configmaps?${WS_WATCH_PARAMS}`;

const STATUS_COLOR: Record<WsStatus, 'green' | 'red' | 'blue'> = {
  connected: 'green',
  connecting: 'blue',
  error: 'red',
  disconnected: 'blue',
};

type EventColor = 'green' | 'blue' | 'red' | 'grey';

const EVENT_COLOR: Record<string, EventColor> = {
  ADDED: 'green',
  MODIFIED: 'blue',
  DELETED: 'red',
};

const eventColor = (type: string): EventColor => EVENT_COLOR[type] ?? 'grey';

type K8sWatchCardProps = {
  bffConnected: boolean;
  clusterReachable: boolean;
};

const K8sWatchCard: React.FC<K8sWatchCardProps> = ({ bffConnected, clusterReachable }) => {
  const [status, setStatus] = React.useState<WsStatus>('disconnected');
  const [events, setEvents] = React.useState<WatchEvent[]>([]);
  const wsRef = React.useRef<WebSocket | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof globalThis.setTimeout>>();

  const disconnect = React.useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
    setEvents([]);
  }, []);

  const connect = React.useCallback(() => {
    disconnect();
    setStatus('connecting');

    const protocol = globalThis.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(
      `${protocol}://${globalThis.location.host}${URL_PREFIX}${WS_WATCH_PATH}`,
    );

    timeoutRef.current = globalThis.setTimeout(() => {
      ws.close();
      setStatus('error');
    }, WS_CONNECT_TIMEOUT);

    ws.onopen = () => {
      clearTimeout(timeoutRef.current);
      setStatus('connected');
    };
    ws.onerror = () => {
      clearTimeout(timeoutRef.current);
      setStatus('error');
    };
    ws.onclose = () => {
      if (wsRef.current !== ws) {
        return;
      }
      setStatus((prev) => (prev === 'error' ? prev : 'disconnected'));
    };
    ws.onmessage = (msg) => {
      if (wsRef.current !== ws) {
        return;
      }
      try {
        const data = JSON.parse(msg.data);
        const name: string = data.object?.metadata?.name ?? 'unknown';
        setEvents((prev) => [
          { type: data.type, name, timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 49),
        ]);
      } catch {
        // ignore non-JSON frames
      }
    };

    wsRef.current = ws;
  }, [disconnect]);

  React.useEffect(() => () => disconnect(), [disconnect]);

  const createConfigMap = React.useCallback(async () => {
    const name = `watch-demo-${Date.now()}`;
    await fetch(`${URL_PREFIX}${CM_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name, namespace: NAMESPACE, labels: { [DEMO_LABEL]: DEMO_LABEL_VALUE } },
        data: { source: 'watch-demo' },
      }),
    });
  }, []);

  const deleteConfigMap = React.useCallback(async (name: string) => {
    await fetch(`${URL_PREFIX}${CM_PATH}/${name}`, { method: 'DELETE' });
  }, []);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const canConnect = bffConnected && !isConnecting;

  let statusIcon: React.ReactNode = <UnpluggedIcon />;
  if (isConnecting) {
    statusIcon = <Spinner size="sm" />;
  } else if (isConnected) {
    statusIcon = <PluggedIcon />;
  }

  let toggleLabel = 'Connect';
  if (isConnecting) {
    toggleLabel = 'Connecting...';
  } else if (isConnected) {
    toggleLabel = 'Disconnect';
  }

  const deletedNames = React.useMemo(() => {
    const deleted = new Set<string>();
    const seen = new Set<string>();
    for (const evt of events) {
      if (!seen.has(evt.name)) {
        seen.add(evt.name);
        if (evt.type === 'DELETED') {
          deleted.add(evt.name);
        }
      }
    }
    return deleted;
  }, [events]);

  return (
    <Card isCompact>
      <CardTitle>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>K8s Watch</FlexItem>
          <FlexItem>
            <Label color="purple" isCompact>
              /wss/k8s
            </Label>
          </FlexItem>
          <FlexItem>
            <Label color={STATUS_COLOR[status]} isCompact icon={statusIcon}>
              {status}
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Button
              variant={isConnected ? 'secondary' : 'primary'}
              size="sm"
              onClick={isConnected ? disconnect : connect}
              isDisabled={!canConnect}
              isLoading={isConnecting}
              icon={isConnected ? <UnpluggedIcon /> : <PluggedIcon />}
              data-testid="ws-toggle"
            >
              {toggleLabel}
            </Button>
          </StackItem>
          {isConnected || events.length > 0 ? (
            <StackItem>
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={createConfigMap}
                      isDisabled={!isConnected || !clusterReachable}
                      icon={<PlusCircleIcon />}
                      data-testid="create-configmap"
                    >
                      Create ConfigMap
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem align={{ default: 'alignEnd' }}>
                    <Label isCompact data-testid="event-count">
                      {events.length} events
                    </Label>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
              <Table aria-label="Watch events" variant="compact" data-testid="watch-events">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Time</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {events.length > 0 ? (
                    events.map((evt, idx) => (
                      <Tr key={`${evt.name}-${evt.timestamp}-${idx}`}>
                        <Td dataLabel="Name">{evt.name}</Td>
                        <Td dataLabel="Time">{evt.timestamp}</Td>
                        <Td dataLabel="Status">
                          <Label
                            color={eventColor(evt.type)}
                            isCompact
                            icon={evt.type === 'DELETED' ? <TrashIcon /> : undefined}
                          >
                            {evt.type}
                          </Label>
                        </Td>
                        <Td dataLabel="Actions">
                          {evt.type === 'ADDED' && !deletedNames.has(evt.name) ? (
                            <Button
                              variant="plain"
                              size="sm"
                              aria-label={`Delete ${evt.name}`}
                              onClick={() => deleteConfigMap(evt.name)}
                              icon={<TrashIcon />}
                            />
                          ) : null}
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={4}>
                        <EmptyState
                          variant={EmptyStateVariant.sm}
                          icon={CubesIcon}
                          titleText="No events yet"
                        >
                          <EmptyStateBody>
                            Create a ConfigMap to see watch events appear here.
                          </EmptyStateBody>
                        </EmptyState>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </StackItem>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
};

export default K8sWatchCard;
