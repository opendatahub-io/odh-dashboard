import React from 'react';
import {
  Alert,
  Content,
  Flex,
  FlexItem,
  Gallery,
  CardBody,
  Stack,
  Label,
} from '@patternfly/react-core';
import CollapsibleSection from '@odh-dashboard/internal/concepts/design/CollapsibleSection';
import useServingPlatformStatuses from '@odh-dashboard/internal/pages/modelServing/useServingPlatformStatuses';
import ModelServingPlatformSelectErrorAlert from '@odh-dashboard/internal/pages/modelServing/screens/ModelServingPlatformSelectErrorAlert';
import SelectSingleModelCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/serverModels/SelectSingleModelCard';
import SelectMultiModelCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/serverModels/SelectMultiModelCard';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { getProjectModelServingPlatform } from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import { ProjectObjectType, SectionType } from '@odh-dashboard/internal/concepts/design/utils';
import OverviewCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/components/OverviewCard';
import AddModelFooter from '@odh-dashboard/internal/pages/projects/screens/detail/overview/serverModels/AddModelFooter';
import { ServingRuntimePlatform } from '@odh-dashboard/internal/types';
import ModelServingPlatformSelectButton from '@odh-dashboard/internal/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';

interface ServeModelsCardProps {
  isMultiPlatform: boolean;
}

const galleryWidth = {
  minWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
  maxWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
};

const ServeModelsCard: React.FC<ServeModelsCardProps> = ({ isMultiPlatform }) => {
  const [errorSelectingPlatform, setErrorSelectingPlatform] = React.useState<Error>();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const servingPlatformStatuses = useServingPlatformStatuses(true);
  const {
    kServe: { enabled: kServeEnabled },
    modelMesh: { enabled: modelMeshEnabled },
  } = servingPlatformStatuses;

  const { platform: currentProjectServingPlatform, error: platformError } =
    getProjectModelServingPlatform(currentProject, servingPlatformStatuses);

  // If no platform is selected -
  if (!currentProjectServingPlatform) {
    return (
      <CollapsibleSection title="Serve models" data-testid="section-model-server">
        <Flex gap={{ default: 'gapMd' }} direction={{ default: 'column' }}>
          <FlexItem>
            <Content
              data-testid="no-model-serving-platform-selected"
              style={{ paddingLeft: 'var(--pf-t--global--spacer--md)' }}
              component="small"
            >
              Select the type of model serving platform to be used when deploying models from this
              project.
            </Content>
          </FlexItem>
          <FlexItem>
            <Gallery hasGutter {...galleryWidth}>
              {kServeEnabled && (
                <SelectSingleModelCard setErrorSelectingPlatform={setErrorSelectingPlatform} />
              )}
              {modelMeshEnabled && (
                <SelectMultiModelCard setErrorSelectingPlatform={setErrorSelectingPlatform} />
              )}
            </Gallery>
          </FlexItem>
          {errorSelectingPlatform && (
            <FlexItem>
              <ModelServingPlatformSelectErrorAlert
                error={errorSelectingPlatform}
                clearError={() => setErrorSelectingPlatform(undefined)}
              />
            </FlexItem>
          )}
          <FlexItem>
            <Alert
              isInline
              variant="info"
              title="You can change the model serving type before the first model is deployed from this project. After deployment, switching types requires deleting all models and servers."
            />
          </FlexItem>
        </Flex>
      </CollapsibleSection>
    );
  }

  // If a platform is selected -
  let card;
  if (isMultiPlatform) {
    card = (
      <OverviewCard
        objectType={ProjectObjectType.modelServer}
        sectionType={SectionType.setup}
        title="No model servers"
        headerInfo={
          <Flex gap={{ default: 'gapSm' }}>
            <Label>Multi-model serving enabled</Label>
            {servingPlatformStatuses.platformEnabledCount > 1 && (
              <ModelServingPlatformSelectButton
                namespace={currentProject.metadata.name}
                servingPlatform={NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}
                setError={setErrorSelectingPlatform}
                variant="link"
                isInline
                data-testid="change-serving-platform-button"
              />
            )}
          </Flex>
        }
      >
        <CardBody>
          <Stack hasGutter>
            {errorSelectingPlatform && (
              <ModelServingPlatformSelectErrorAlert
                error={errorSelectingPlatform}
                clearError={() => setErrorSelectingPlatform(undefined)}
              />
            )}
            {platformError ? (
              <Alert isInline title="Loading error" variant="danger">
                {platformError.message}
              </Alert>
            ) : (
              <Content component="small">
                Before deploying a model, you must first add a model server.
              </Content>
            )}
          </Stack>
        </CardBody>
        {!platformError ? <AddModelFooter selectedPlatform={ServingRuntimePlatform.MULTI} /> : null}
      </OverviewCard>
    );
  } else {
    card = (
      <OverviewCard
        objectType={ProjectObjectType.deployedModels}
        sectionType={SectionType.serving}
        title="Deployed models"
        headerInfo={
          <Flex gap={{ default: 'gapSm' }}>
            <Label>Single-model serving enabled</Label>
            {servingPlatformStatuses.platformEnabledCount > 1 && (
              <ModelServingPlatformSelectButton
                namespace={currentProject.metadata.name}
                servingPlatform={NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}
                setError={setErrorSelectingPlatform}
                variant="link"
                isInline
                data-testid="change-serving-platform-button"
              />
            )}
          </Flex>
        }
      >
        <CardBody>
          <Stack hasGutter>
            {errorSelectingPlatform && (
              <ModelServingPlatformSelectErrorAlert
                error={errorSelectingPlatform}
                clearError={() => setErrorSelectingPlatform(undefined)}
              />
            )}
            {platformError ? (
              <Alert isInline title="Loading error" variant="danger">
                {platformError.message}
              </Alert>
            ) : (
              <Content component="small">Each model is deployed on its own model server.</Content>
            )}
          </Stack>
        </CardBody>
        {!platformError ? <AddModelFooter /> : null}
      </OverviewCard>
    );
  }

  return (
    <CollapsibleSection title="Serve models" data-testid="section-model-server">
      {card}
    </CollapsibleSection>
  );
};

export default ServeModelsCard;
