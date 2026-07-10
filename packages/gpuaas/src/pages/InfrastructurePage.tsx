import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Card, CardBody, Content, Icon, Label, Stack, StackItem } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { INFRASTRUCTURE_SECTIONS } from '../const';
import ClusterSummaryCards from '../components/ClusterSummaryCards';
import BorrowingLendingSection from '../components/BorrowingLendingSection';
import useInfrastructureMetrics from '../hooks/useInfrastructureMetrics';

type SectionId = (typeof INFRASTRUCTURE_SECTIONS)[number]['id'];

const formatRefreshTime = (date: Date): string =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const InfrastructurePage: React.FC = () => {
  const metrics = useInfrastructureMetrics();

  const SECTION_COMPONENTS: Record<SectionId, React.ReactElement | null> = {
    cluster: <ClusterSummaryCards metrics={metrics} />,
    'hardware-usage': null,
    'borrowing-lending': <BorrowingLendingSection />,
    'cluster-queue-utilization': null,
  };

  const headerAction = metrics.lastRefreshed ? (
    <Label
      icon={
        <Icon isInline>
          <SyncAltIcon />
        </Icon>
      }
      data-testid="infrastructure-refresh-badge"
    >
      Refreshed ({formatRefreshTime(metrics.lastRefreshed)})
    </Label>
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
        {INFRASTRUCTURE_SECTIONS.map(({ id, title, description }) => (
          <StackItem key={id}>
            <Stack hasGutter>
              <StackItem>
                <Content component="h2">{title}</Content>
                {description && <Content component="p">{description}</Content>}
              </StackItem>
              <StackItem>
                <Card data-testid={`infrastructure-${id}-section`}>
                  <CardBody>{SECTION_COMPONENTS[id]}</CardBody>
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
