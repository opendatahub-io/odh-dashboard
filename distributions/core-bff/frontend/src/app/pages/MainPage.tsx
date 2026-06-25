import React from 'react';
import { Grid, GridItem, Stack, StackItem } from '@patternfly/react-core';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import BffStatusAlert from '~/app/components/BffStatusAlert';
import SessionStatusCard from '~/app/components/SessionStatusCard';
import NamespacesCard from '~/app/components/NamespacesCard';
import K8sWatchCard from '~/app/components/K8sWatchCard';
import DashboardConfigCard from '~/app/components/DashboardConfigCard';
import ClusterSettingsCard from '~/app/components/ClusterSettingsCard';
import ComponentsCard from '~/app/components/ComponentsCard';
import ConnectionTypesCard from '~/app/components/ConnectionTypesCard';
import AllowedUsersCard from '~/app/components/AllowedUsersCard';
import { useBffStatus } from '~/app/context/BffStatusContext';

const MainPage: React.FC = () => {
  const { connected, loaded } = useBffStatus();
  const clusterReachable = connected && loaded;

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
          <BffStatusAlert />
        </StackItem>
        <StackItem>
          <Grid hasGutter>
            <GridItem md={6}>
              <Stack hasGutter>
                <StackItem>
                  <SessionStatusCard />
                </StackItem>
                <StackItem>
                  <NamespacesCard />
                </StackItem>
                <StackItem>
                  <K8sWatchCard bffConnected={connected} clusterReachable={clusterReachable} />
                </StackItem>
              </Stack>
            </GridItem>
            <GridItem md={6}>
              <Stack hasGutter>
                <StackItem>
                  <DashboardConfigCard />
                </StackItem>
                <StackItem>
                  <ClusterSettingsCard />
                </StackItem>
                <StackItem>
                  <ComponentsCard />
                </StackItem>
                <StackItem>
                  <ConnectionTypesCard />
                </StackItem>
                <StackItem>
                  <AllowedUsersCard />
                </StackItem>
              </Stack>
            </GridItem>
          </Grid>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default MainPage;
