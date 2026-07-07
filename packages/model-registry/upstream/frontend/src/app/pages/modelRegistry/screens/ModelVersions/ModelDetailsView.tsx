import * as React from 'react';
import { Grid, GridItem, Stack } from '@patternfly/react-core';
import { useExtensions, LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { isDetailCardExtension } from '@odh-dashboard/plugin-core/extension-points';
import { useParams } from 'react-router';
import { RegisteredModel } from '~/app/types';
import ModelDetailsCard from './ModelDetailsCard';
import ModelVersionsCard from './ModelVersionsCard';

const MODEL_REGISTRY_DETAILS_CARD_GROUP = 'model-registry.model-details';

type ModelDetailsViewProps = {
  registeredModel: RegisteredModel;
  refresh: () => void;
  isArchiveModel?: boolean;
};

const ModelDetailsView: React.FC<ModelDetailsViewProps> = ({
  registeredModel: rm,
  refresh,
  isArchiveModel,
}) => {
  const { modelRegistry } = useParams<{ modelRegistry: string }>();
  const cardExtensions = useExtensions(isDetailCardExtension);
  const deploymentCard = cardExtensions
    .filter((ext) => ext.properties.group === MODEL_REGISTRY_DETAILS_CARD_GROUP)
    .map((extension) => (
      <LazyCodeRefComponent
        key={extension.uid}
        component={extension.properties.component}
        props={{ mrName: modelRegistry, rmId: rm.id }}
      />
    ));

  return (
    <Grid hasGutter>
      <GridItem span={12} lg={8}>
        <ModelDetailsCard registeredModel={rm} refresh={refresh} isArchiveModel={isArchiveModel} />
      </GridItem>
      <GridItem span={12} lg={4}>
        <Stack hasGutter>
          <ModelVersionsCard rm={rm} isArchiveModel={isArchiveModel} />
          {deploymentCard}
        </Stack>
      </GridItem>
    </Grid>
  );
};

export default ModelDetailsView;
