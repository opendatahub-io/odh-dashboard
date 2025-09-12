import * as React from 'react';
import { Card, CardBody, CardTitle, Stack, StackItem } from '@patternfly/react-core';
import { DWStatusOverviewDonutChart } from './DWStatusOverviewDonutChart';
import { DWWorkloadsTable } from './DWWorkloadsTable';

const GlobalDistributedWorkloadsWorkloadStatusTab: React.FC = () => (
  <Stack hasGutter>
    <StackItem>
      <Card isFullHeight data-testid="dw-status-overview-card">
        <CardTitle>Status overview</CardTitle>
        <CardBody>
          <DWStatusOverviewDonutChart />
        </CardBody>
      </Card>
    </StackItem>
    <StackItem>
      <Card data-testid="dw-workloads-table-card">
        <CardTitle>Workload metrics</CardTitle>
        <DWWorkloadsTable />
      </Card>
    </StackItem>
  </Stack>
);

export default GlobalDistributedWorkloadsWorkloadStatusTab;
