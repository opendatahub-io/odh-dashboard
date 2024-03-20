import * as React from 'react';
import { Grid, GridItem } from '@patternfly/react-core';
import { DWStatusOverviewDonutChart } from './DWStatusOverviewDonutChart';
import { DWWorkloadsTable } from './DWWorkloadsTable';

const GlobalDistributedWorkloadsWorkloadStatusTab: React.FC = () => (
  <Grid hasGutter>
    <GridItem span={12}>
      <DWStatusOverviewDonutChart />
    </GridItem>
    <GridItem span={12}>
      <DWWorkloadsTable />
    </GridItem>
  </Grid>
);

export default GlobalDistributedWorkloadsWorkloadStatusTab;
