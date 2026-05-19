import React from 'react';
import { Button, Content, Flex, FlexItem, Spinner } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { getPodContainerLogText } from '@odh-dashboard/internal/api/k8s/pods';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';

const TAIL_LINES = 500;

type DeploymentLogsTabProps = {
  namespace: string;
  deploymentName: string;
};

type ContainerInfo = {
  name: string;
  isInit: boolean;
};

const getContainersForPod = (pod: PodKind): ContainerInfo[] => {
  const initContainers = (pod.spec.initContainers ?? []).map((c) => ({
    name: c.name,
    isInit: true,
  }));
  const containers = pod.spec.containers.map((c) => ({
    name: c.name,
    isInit: false,
  }));
  return [...initContainers, ...containers];
};

const useDeploymentPods = (namespace: string, deploymentName: string): [PodKind[], boolean] => {
  const [pods, loaded] = useK8sWatchResourceList<PodKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace,
    },
    PodModel,
  );

  const filteredPods = React.useMemo(
    () => pods.filter((pod) => pod.metadata.name.startsWith(`${deploymentName}-`)),
    [pods, deploymentName],
  );

  return [filteredPods, loaded];
};

const DeploymentLogsTab: React.FC<DeploymentLogsTabProps> = ({ namespace, deploymentName }) => {
  const [pods, podsLoaded] = useDeploymentPods(namespace, deploymentName);
  const [selectedPodName, setSelectedPodName] = React.useState<string | undefined>();
  const [selectedContainer, setSelectedContainer] = React.useState<string | undefined>();
  const [logs, setLogs] = React.useState<string>('');
  const [logsLoading, setLogsLoading] = React.useState(false);
  const [logsError, setLogsError] = React.useState<string | undefined>();

  const selectedPod = React.useMemo(
    () => pods.find((p) => p.metadata.name === selectedPodName),
    [pods, selectedPodName],
  );

  const containers = React.useMemo(
    () => (selectedPod ? getContainersForPod(selectedPod) : []),
    [selectedPod],
  );

  React.useEffect(() => {
    if (!selectedPodName && pods.length > 0) {
      setSelectedPodName(pods[0].metadata.name);
    }
  }, [pods, selectedPodName]);

  React.useEffect(() => {
    if (containers.length > 0 && !containers.some((c) => c.name === selectedContainer)) {
      const mainContainer = containers.find((c) => !c.isInit);
      setSelectedContainer(mainContainer?.name ?? containers[0].name);
    }
  }, [containers, selectedContainer]);

  const fetchLogs = React.useCallback(() => {
    if (!selectedPodName || !selectedContainer) {
      return;
    }
    setLogsLoading(true);
    setLogsError(undefined);
    getPodContainerLogText(namespace, selectedPodName, selectedContainer, TAIL_LINES)
      .then((text) => {
        setLogs(text);
        setLogsLoading(false);
      })
      .catch((err: unknown) => {
        setLogsError(err instanceof Error ? err.message : String(err));
        setLogs('');
        setLogsLoading(false);
      });
  }, [namespace, selectedPodName, selectedContainer]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!podsLoaded) {
    return (
      <Flex justifyContent={{ default: 'justifyContentCenter' }}>
        <Spinner size="lg" />
      </Flex>
    );
  }

  if (pods.length === 0) {
    return <Content data-testid="no-pods-message">No pods found for this deployment.</Content>;
  }

  const podOptions = pods.map((pod) => ({
    key: pod.metadata.name,
    label: pod.metadata.name,
  }));

  const containerOptions = containers.map((c) => ({
    key: c.name,
    label: c.isInit ? `${c.name} (init)` : c.name,
  }));

  return (
    <Flex direction={{ default: 'column' }} style={{ height: '100%' }} gap={{ default: 'gapSm' }}>
      <FlexItem>
        <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <SimpleSelect
              options={podOptions}
              value={selectedPodName}
              onChange={(key) => setSelectedPodName(key)}
              placeholder="Select pod"
              dataTestId="pod-selector"
              popperProps={{ maxWidth: undefined }}
            />
          </FlexItem>
          <FlexItem>
            <SimpleSelect
              options={containerOptions}
              value={selectedContainer}
              onChange={(key) => setSelectedContainer(key)}
              placeholder="Select container"
              dataTestId="container-selector"
              popperProps={{ maxWidth: undefined }}
            />
          </FlexItem>
          <FlexItem>
            <Button
              variant="plain"
              aria-label="Refresh logs"
              onClick={fetchLogs}
              isDisabled={logsLoading}
              data-testid="refresh-logs"
            >
              <SyncAltIcon />
            </Button>
          </FlexItem>
        </Flex>
      </FlexItem>
      <FlexItem flex={{ default: 'flex_1' }} style={{ minHeight: 0, overflow: 'auto' }}>
        {logsLoading ? (
          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <Spinner size="lg" />
          </Flex>
        ) : logsError ? (
          <Content data-testid="logs-error">Failed to load logs: {logsError}</Content>
        ) : (
          <pre
            data-testid="deployment-logs-content"
            style={{
              margin: 0,
              padding: 'var(--pf-t--global--spacer--sm)',
              fontSize: 'var(--pf-t--global--font--size--sm)',
              whiteSpace: 'pre',
              backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
              height: '100%',
              overflow: 'auto',
            }}
          >
            {logs || 'No logs available.'}
          </pre>
        )}
      </FlexItem>
    </Flex>
  );
};

export default DeploymentLogsTab;
