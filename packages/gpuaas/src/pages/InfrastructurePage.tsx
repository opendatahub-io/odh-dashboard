import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  ContentVariants,
  Icon,
  Label,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { INFRASTRUCTURE_SECTIONS } from '../const';
import ClusterSummaryCards from '../components/ClusterSummaryCards';
import useInfrastructureMetrics from '../hooks/useInfrastructureMetrics';

const formatRefreshTime = (date: Date): string =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const InfrastructurePage: React.FC = () => {
  const metrics = useInfrastructureMetrics();

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
        <StackItem data-testid="infrastructure-cluster-section">
          <Content component={ContentVariants.h2}>{INFRASTRUCTURE_SECTIONS[0].title}</Content>
          <ClusterSummaryCards metrics={metrics} />
        </StackItem>
        {INFRASTRUCTURE_SECTIONS.slice(1).map(({ id, title }) => (
          <StackItem key={id}>
            <Card data-testid={`infrastructure-${id}-section`}>
              <CardTitle>{title}</CardTitle>
              <CardBody />
            </Card>
          </StackItem>
        ))}
      </Stack>
    </ApplicationsPage>
  );
};

export default InfrastructurePage;
