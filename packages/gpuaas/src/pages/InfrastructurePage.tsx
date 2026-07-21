import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import {
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Tooltip,
  Title,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import { INFRASTRUCTURE_SECTIONS } from '../const';
import { GPUAAS_EVENTS, type PageViewedProperties } from '../tracking/gpuaasTrackingConstants';
import ClusterSummaryCards from '../components/ClusterSummaryCards';
import HardwareUsageSection from '../components/HardwareUsageSection';
import BorrowingLendingSection from '../components/BorrowingLendingSection';
import ClusterQueueUtilizationSection from '../components/ClusterQueueUtilizationSection';
import useInfrastructureMetrics from '../hooks/useInfrastructureMetrics';

type SectionId = (typeof INFRASTRUCTURE_SECTIONS)[number]['id'];

const InfrastructurePage: React.FC = () => {
  const metrics = useInfrastructureMetrics();
  const isKueueAvailable = useIsAreaAvailable(SupportedArea.KUEUE).status;
  const hasTrackedPageView = React.useRef(false);

  React.useEffect(() => {
    if (metrics.loaded && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      const totalAccelerators = metrics.accelerators?.total;
      const acceleratorsInUse = metrics.accelerators?.inUse;
      const props: PageViewedProperties = {
        path: '/observe-and-monitor/infrastructure',
        sectionCount: INFRASTRUCTURE_SECTIONS.length,
        hasKueueEnabled: isKueueAvailable,
        totalAccelerators,
        acceleratorsInUse,
        totalUtilizationPct:
          totalAccelerators && totalAccelerators > 0
            ? Math.round(((acceleratorsInUse ?? 0) / totalAccelerators) * 100)
            : undefined,
        avgComputeUtilPct: metrics.computeUtilization?.percentage,
        avgMemoryUtilPct: metrics.memoryUtilization?.percentage,
      };
      fireMiscTrackingEvent(GPUAAS_EVENTS.PAGE_VIEWED, props);
    }
  }, [
    metrics.loaded,
    metrics.accelerators,
    metrics.computeUtilization,
    metrics.memoryUtilization,
    isKueueAvailable,
  ]);

  const handleRefresh = React.useCallback(() => {
    const secondsSinceLastUpdate = metrics.lastRefreshed
      ? Math.round((Date.now() - metrics.lastRefreshed.getTime()) / 1000)
      : undefined;
    metrics.refresh();
    fireMiscTrackingEvent(GPUAAS_EVENTS.DATA_REFRESHED, { secondsSinceLastUpdate });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .refresh is stable from useFetch
  }, [metrics.lastRefreshed, metrics.refresh]);

  const SECTION_COMPONENTS: Record<SectionId, React.ReactElement | null> = {
    cluster: <ClusterSummaryCards metrics={metrics} />,
    'hardware-usage': <HardwareUsageSection metrics={metrics} />,
    'borrowing-lending': <BorrowingLendingSection />,
    'cluster-queue-utilization': <ClusterQueueUtilizationSection />,
  };

  const headerAction = metrics.lastRefreshed ? (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      spaceItems={{ default: 'spaceItemsSm' }}
      data-testid="infrastructure-refresh-badge"
    >
      <FlexItem>
        <Tooltip content="Refresh">
          <Button variant="plain" aria-label="Refresh" onClick={handleRefresh}>
            <SyncAltIcon />
          </Button>
        </Tooltip>
      </FlexItem>
      <FlexItem>
        <Content component="small">
          Last updated {relativeTime(Date.now(), metrics.lastRefreshed.getTime())}
        </Content>
      </FlexItem>
    </Flex>
  ) : null;

  return (
    <ApplicationsPage
      title="Infrastructure"
      description="Current accelerator allocation and quota consumption for this cluster. Cluster queues are grouped into cohorts to share resources."
      loaded
      empty={false}
      provideChildrenPadding
      headerAction={headerAction}
    >
      <Stack hasGutter>
        {INFRASTRUCTURE_SECTIONS.map(({ id, title, description, isPlain }) => (
          <StackItem key={id}>
            <Stack hasGutter>
              <StackItem>
                <Title headingLevel="h2" data-testid={`infrastructure-${id}-title`}>
                  {title}
                </Title>
                <Content component="p" data-testid={`infrastructure-${id}-description`}>
                  {description}
                </Content>
              </StackItem>
              <StackItem>
                <Card isPlain={isPlain} data-testid={`infrastructure-${id}-section`}>
                  {isPlain ? SECTION_COMPONENTS[id] : <CardBody>{SECTION_COMPONENTS[id]}</CardBody>}
                </Card>
              </StackItem>
            </Stack>
          </StackItem>
        ))}
      </Stack>
    </ApplicationsPage>
  );
};

export default InfrastructurePage;
