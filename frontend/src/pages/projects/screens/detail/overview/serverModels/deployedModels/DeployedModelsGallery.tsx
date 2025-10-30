import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Gallery,
  Content,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from '@patternfly/react-icons';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { getPodsForKserve } from '#~/api';
import {
  checkModelPodStatus,
  getInferenceServiceModelState,
} from '#~/concepts/modelServingKServe/kserveStatusUtils';
import { ModelDeploymentState, ModelStatus } from '#~/pages/modelServing/screens/types';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import DeployedModelCard from './DeployedModelCard';

const SUCCESS_STATUSES = [ModelDeploymentState.LOADED, ModelDeploymentState.STANDBY];
const FAILED_STATUSES = [ModelDeploymentState.FAILED_TO_LOAD];

type InferenceServiceStates = { [key: string]: ModelDeploymentState };

interface DeployedModelsGalleryProps {
  deployedModels: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
  showFailed: boolean;
  showSuccessful: boolean;
  onClearFilters: () => void;
}

const DeployedModelsGallery: React.FC<DeployedModelsGalleryProps> = ({
  deployedModels,
  servingRuntimes,
  showSuccessful,
  showFailed,
  onClearFilters,
}) => {
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const [inferenceServiceStates, setInferenceServiceStates] =
    React.useState<InferenceServiceStates>({});

  React.useEffect(() => {
    let canceled = false;

    const updateServiceState = (inferenceService: InferenceServiceKind, status?: ModelStatus) => {
      const state = status?.failedToSchedule
        ? ModelDeploymentState.FAILED_TO_LOAD
        : getInferenceServiceModelState(inferenceService);

      setInferenceServiceStates((prev) => {
        const states = { ...prev };
        states[inferenceService.metadata.name] = state;
        return states;
      });
    };

    const getServicesForStatus = async () => {
      for (const deployedModel of deployedModels) {
        try {
          // Always use KServe (no ModelMesh)
          const modelPods = await getPodsForKserve(
            namespace,
            deployedModel.spec.predictor.model?.runtime ?? '',
          );
          if (!canceled) {
            updateServiceState(deployedModel, checkModelPodStatus(modelPods[0]));
          }
        } catch (e) {
          updateServiceState(deployedModel);
        }
      }
    };

    getServicesForStatus();

    return () => {
      canceled = true;
    };
  }, [deployedModels, namespace]);

  const filteredServices = React.useMemo(
    () =>
      deployedModels.filter((deployedModel) => {
        const state = inferenceServiceStates[deployedModel.metadata.name];
        return (
          showFailed === showSuccessful ||
          (showSuccessful && SUCCESS_STATUSES.includes(state)) ||
          (showFailed && FAILED_STATUSES.includes(state))
        );
      }),
    [inferenceServiceStates, deployedModels, showFailed, showSuccessful],
  );

  const shownServices = filteredServices.slice(0, 5);

  if (filteredServices.length === 0 && deployedModels.length > 0) {
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
        {shownServices.map((model) => (
          <DeployedModelCard
            key={model.metadata.uid}
            inferenceService={model}
            servingRuntime={servingRuntimes.find(
              (sr) => sr.metadata.name === model.spec.predictor.model?.runtime,
            )}
          />
        ))}
      </Gallery>
      <Flex gap={{ default: 'gapMd' }}>
        <FlexItem>
          <Content>
            <Content component="small">
              {shownServices.length} of {filteredServices.length} models
            </Content>
          </Content>
        </FlexItem>
        <FlexItem>
          <Button
            variant="link"
            onClick={() =>
              navigate(
                `/projects/${currentProject.metadata.name}?section=${ProjectSectionID.MODEL_SERVER}`,
              )
            }
          >
            View all
          </Button>
        </FlexItem>
      </Flex>
    </>
  );
};

export default DeployedModelsGallery;
