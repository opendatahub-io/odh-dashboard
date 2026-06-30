import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Card, CardBody, CardTitle, Stack, StackItem } from '@patternfly/react-core';
import { INFRASTRUCTURE_SECTIONS } from '../const';

const InfrastructurePage: React.FC = () => (
  <ApplicationsPage
    title="Infrastructure"
    description="Cluster capacity and accelerator utilization."
    loaded
    empty={false}
    provideChildrenPadding
  >
    <Stack hasGutter>
      {INFRASTRUCTURE_SECTIONS.map(({ id, title }) => (
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

export default InfrastructurePage;
