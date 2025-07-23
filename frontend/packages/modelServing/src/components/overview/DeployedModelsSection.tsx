import React from 'react';
import {
  CardBody,
  Stack,
  CardFooter,
  Flex,
  Label,
  ToggleGroup,
  FlexItem,
  ToggleGroupItem,
  GalleryItem,
  Gallery,
  Button,
  Content,
  ContentVariants,
  CardHeader,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { useNavigate, Link } from 'react-router-dom';
import { SearchIcon } from '@patternfly/react-icons';
import { ProjectObjectType, SectionType } from '@odh-dashboard/internal/concepts/design/utils';
import OverviewCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/components/OverviewCard';
import TypeBorderedCard from '@odh-dashboard/internal/concepts/design/TypeBorderedCard';
import HeaderIcon from '@odh-dashboard/internal/concepts/design/HeaderIcon';
import CollapsibleSection from '@odh-dashboard/internal/concepts/design/CollapsibleSection';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { useExtensions, LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import { useDeploymentExtension } from '../../concepts/extensionUtils';
import {
  Deployment,
  isModelServingPlatformExtension,
  isDeployedModelServingRuntime,
} from '../../../extension-points';
import DeploymentStatus from '../deployments/DeploymentStatus';

enum FilterStates {
  success = 'success',
  failed = 'failed',
}

const SUCCESS_STATUSES = [InferenceServiceModelState.LOADED, InferenceServiceModelState.STANDBY];
const FAILED_STATUSES = [InferenceServiceModelState.FAILED_TO_LOAD];

const DeployedModelCard: React.FC<{ deployment: Deployment }> = ({ deployment }) => {
  const displayName = getDisplayNameFromK8sResource(deployment.model);
  const servingRuntimeExtension = useDeploymentExtension(isDeployedModelServingRuntime, deployment);

  const renderServingRuntime = () => {
    if (servingRuntimeExtension) {
      return (
        <LazyCodeRefComponent
          component={servingRuntimeExtension.properties.ServingRuntimeComponent}
          props={{ deployment }}
        />
      );
    }
    return deployment.server?.metadata.annotations?.['opendatahub.io/template-display-name'] ?? '-';
  };

  return (
    <GalleryItem key={deployment.model.metadata.uid}>
      <TypeBorderedCard isFullHeight objectType={ProjectObjectType.modelServer}>
        <CardHeader>
          <Flex gap={{ default: 'gapSm' }} direction={{ default: 'column' }}>
            <FlexItem>
              <ModelStatusIcon
                state={deployment.status?.state ?? InferenceServiceModelState.UNKNOWN}
                bodyContent={deployment.status?.message}
              />
            </FlexItem>
            <FlexItem>
              <ResourceNameTooltip resource={deployment.model}>
                {deployment.model.metadata.namespace &&
                deployment.status?.state === InferenceServiceModelState.LOADED ? (
                  <Link
                    to={`/projects/${deployment.model.metadata.namespace}/metrics/model/${deployment.model.metadata.name}`}
                  >
                    {displayName}
                  </Link>
                ) : (
                  displayName
                )}
              </ResourceNameTooltip>
            </FlexItem>
          </Flex>
        </CardHeader>
        <CardBody>
          <Content>
            <Content component={ContentVariants.dl} style={{ display: 'block' }}>
              <Content
                component={ContentVariants.dt}
                style={{ marginBottom: 'var(--pf-t--global--spacer--xs)' }}
              >
                Serving runtime
              </Content>
              <Content
                component={ContentVariants.dd}
                style={{
                  fontSize: 'var(--pf-t--global--font--size--body--sm)',
                }}
              >
                {renderServingRuntime()}
              </Content>
            </Content>
          </Content>
        </CardBody>
        <CardFooter>
          <DeploymentStatus deployment={deployment} />
        </CardFooter>
      </TypeBorderedCard>
    </GalleryItem>
  );
};

type DeployedModelsGalleryProps = {
  showSuccessful: boolean;
  showFailed: boolean;
  onClearFilters: () => void;
};

const DeployedModelsGallery: React.FC<DeployedModelsGalleryProps> = ({
  showSuccessful,
  showFailed,
  onClearFilters,
}) => {
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { deployments } = React.useContext(ModelDeploymentsContext);

  const filteredDeployments = React.useMemo(
    () =>
      (deployments || []).filter((deployment) => {
        const state = deployment.status?.state;
        return (
          showFailed === showSuccessful ||
          (showSuccessful && state && SUCCESS_STATUSES.includes(state)) ||
          (showFailed && state && FAILED_STATUSES.includes(state))
        );
      }),
    [deployments, showFailed, showSuccessful],
  );

  const shownDeployments = filteredDeployments.slice(0, 5);

  if (filteredDeployments.length === 0 && deployments && deployments.length > 0) {
    return (
      <EmptyState icon={SearchIcon} titleText="No results found" variant="sm">
        <EmptyStateBody>Clear the filter or apply a different one.</EmptyStateBody>
        <EmptyStateFooter>
          <Button isInline variant="link" onClick={onClearFilters}>
            Clear filter
          </Button>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <>
      <Gallery
        hasGutter
        minWidths={{ default: '285px' }}
        style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }}
      >
        {shownDeployments.map((deployment) => (
          <DeployedModelCard key={deployment.model.metadata.uid} deployment={deployment} />
        ))}
      </Gallery>
      <Flex gap={{ default: 'gapMd' }}>
        <FlexItem>
          <Content>
            <Content component="small">
              {shownDeployments.length} of {filteredDeployments.length} models
            </Content>
          </Content>
        </FlexItem>
        <FlexItem>
          <Button
            variant="link"
            onClick={() =>
              navigate(`/projects/${currentProject.metadata.name}?section=model-server`)
            }
          >
            View all
          </Button>
        </FlexItem>
      </Flex>
    </>
  );
};

const DeployedModelsSection: React.FC = () => {
  const availablePlatforms = useExtensions(isModelServingPlatformExtension);
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const { activePlatform } = useProjectServingPlatform(currentProject, availablePlatforms);
  const [filteredState, setFilteredState] = React.useState<FilterStates | undefined>();

  if (!deploymentsLoaded) {
    return (
      <CollapsibleSection title="Serve models" data-testid="section-model-server">
        <OverviewCard
          objectType={ProjectObjectType.deployedModels}
          sectionType={SectionType.serving}
          title="Deployed models"
        >
          <CardBody>
            <Stack hasGutter>
              <Content component="small">Loading deployed models...</Content>
            </Stack>
          </CardBody>
        </OverviewCard>
      </CollapsibleSection>
    );
  }

  const platformLabel = activePlatform?.properties.enableCardText.enabledText;

  return (
    <CollapsibleSection title="Serve models" data-testid="section-model-server">
      <TypeBorderedCard objectType={ProjectObjectType.deployedModels}>
        <CardHeader>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <HeaderIcon type={ProjectObjectType.deployedModels} />
            <FlexItem>
              <Content>
                <Content component="h3">
                  <b>Deployed models</b>
                </Content>
              </Content>
            </FlexItem>
            <FlexItem>
              <ToggleGroup
                style={{ marginLeft: 'var(--pf-t--global--spacer--md)' }}
                aria-label="Filter deployed models"
              >
                <ToggleGroupItem
                  text="Successful"
                  buttonId="successful-filter"
                  isSelected={filteredState === FilterStates.success}
                  onChange={(e, selected) =>
                    setFilteredState(selected ? FilterStates.success : undefined)
                  }
                />
                <ToggleGroupItem
                  text="Failed"
                  buttonId="failed-filter"
                  isSelected={filteredState === FilterStates.failed}
                  onChange={(e, selected) =>
                    setFilteredState(selected ? FilterStates.failed : undefined)
                  }
                />
              </ToggleGroup>
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1' }}>
              <Label style={{ float: 'right' }}>{platformLabel}</Label>
            </FlexItem>
          </Flex>
        </CardHeader>
        <CardBody>
          <DeployedModelsGallery
            showSuccessful={!filteredState || filteredState === FilterStates.success}
            showFailed={!filteredState || filteredState === FilterStates.failed}
            onClearFilters={() => setFilteredState(undefined)}
          />
        </CardBody>
      </TypeBorderedCard>
    </CollapsibleSection>
  );
};

export default DeployedModelsSection;
