import * as React from 'react';
import { ClipboardCopy, Grid, GridItem, Stack, StackItem } from '@patternfly/react-core';
import { ProjectDetailsContext } from '../../../projects/ProjectDetailsContext';
import { getDisplayNameFromK8sResource } from 'pages/projects/utils';

const ServingRuntimeTokens: React.FC = () => {
  const {
    serverSecrets: { data: secrets },
  } = React.useContext(ProjectDetailsContext);

  return (
    <Stack hasGutter>
      {secrets.map((secret) => (
        <StackItem key={secret.metadata.uid}>
          <Grid hasGutter style={{ alignItems: 'center' }}>
            <GridItem span={2}>
              {getDisplayNameFromK8sResource(secret) || secret.metadata.name}
            </GridItem>
            <GridItem span={4}>
              <ClipboardCopy isReadOnly>
                {secret.data?.token ? atob(secret.data.token) : 'Unknown'}
              </ClipboardCopy>
            </GridItem>
          </Grid>
        </StackItem>
      ))}
    </Stack>
  );
};

export default ServingRuntimeTokens;
