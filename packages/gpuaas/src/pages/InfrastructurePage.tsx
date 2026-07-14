import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
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
import ClusterSummaryCards from '../components/ClusterSummaryCards';
import HardwareUsageSection from '../components/HardwareUsageSection';
import BorrowingLendingSection from '../components/BorrowingLendingSection';
import ClusterQueueUtilizationSection from '../components/ClusterQueueUtilizationSection';
import useInfrastructureMetrics from '../hooks/useInfrastructureMetrics';

type SectionId = (typeof INFRASTRUCTURE_SECTIONS)[number]['id'];

const InfrastructurePage: React.FC = () => {
  const metrics = useInfrastructureMetrics();

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
        <Tooltip content="Refresh page data">
          <Button variant="plain" aria-label="Refresh page data" onClick={metrics.refresh}>
            <SyncAltIcon />
          </Button>
        </Tooltip>
      </FlexItem>
      <FlexItem>
        <Content component="small">
          Last update: {relativeTime(Date.now(), metrics.lastRefreshed.getTime())}
        </Content>
      </FlexItem>
    </Flex>
  ) : null;

  return (
    <ApplicationsPage
      title="Infrastructure"
      description="Cluster capacity and accelerator utilization."
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
