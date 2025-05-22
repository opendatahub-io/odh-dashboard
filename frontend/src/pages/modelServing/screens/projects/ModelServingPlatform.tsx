import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  Alert,
  Button,
  Content,
  EmptyStateActions,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Label,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimePlatform } from '~/types';
import {
  getProjectModelServingPlatform,
  isCurrentServingPlatformEnabled,
} from '~/pages/modelServing/screens/projects/utils';
import KServeInferenceServiceTable from '~/pages/modelServing/screens/projects/KServeSection/KServeInferenceServiceTable';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import EmptySingleModelServingCard from '~/pages/modelServing/screens/projects/EmptySingleModelServingCard';
import EmptyMultiModelServingCard from '~/pages/modelServing/screens/projects/EmptyMultiModelServingCard';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import EmptyModelServingPlatform from '~/pages/modelServing/screens/projects/EmptyModelServingPlatform';
import EmptyNIMModelServingCard from '~/pages/modelServing/screens/projects/EmptyNIMModelServingCard';
import { isProjectNIMSupported } from '~/pages/modelServing/screens/projects/nimUtils';
import ManageNIMServingModal from '~/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import ModelServingPlatformSelectErrorAlert from '~/pages/modelServing/screens/ModelServingPlatformSelectErrorAlert';
import { modelVersionRoute } from '~/routes/modelRegistry/modelVersions';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ModelMeshServingRuntimeTable from './ModelMeshSection/ServingRuntimeTable';
import ModelServingPlatformButtonAction from './ModelServingPlatformButtonAction';
import ManageKServeModal from './kServeModal/ManageKServeModal';

const ModelServingPlatform: React.FC = () => {
  const [platformSelected, setPlatformSelected] = React.useState<
    ServingRuntimePlatform | undefined
  >(undefined);

  const [errorSelectingPlatform, setErrorSelectingPlatform] = React.useState<Error>();

  const navigate = useNavigate();
  const [queryParams] = useSearchParams();
  const modelRegistryName = queryParams.get('modelRegistryName');
  const registeredModelId = queryParams.get('registeredModelId');
  const modelVersionId = queryParams.get('modelVersionId');
  // deployingFromRegistry = User came from the Model Registry page because this project didn't have a serving platform selected
  const deployingFromRegistry = !!(modelRegistryName && registeredModelId && modelVersionId);

  const servingPlatformStatuses = useServingPlatformStatuses();
  const kServeEnabled = servingPlatformStatuses.kServe.enabled;
  const modelMeshEnabled = servingPlatformStatuses.modelMesh.enabled;
  const isNIMAvailable = servingPlatformStatuses.kServeNIM.enabled;

  const {
    servingRuntimes: {
      data: { items: servingRuntimes },
      loaded: servingRuntimesLoaded,
      error: servingRuntimeError,
      refresh: refreshServingRuntime,
    },
    servingRuntimeTemplates: [templates, templatesLoaded, templateError],
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    connections: { data: connections },
    serverSecrets: { refresh: refreshTokens },
    inferenceServices: {
      data: { items: inferenceServices },
      refresh: refreshInferenceServices,
    },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const isKServeNIMEnabled = isProjectNIMSupported(currentProject);

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );

  const emptyTemplates = templatesEnabled.length === 0;

  const { platform: currentProjectServingPlatform, error: platformError } =
    getProjectModelServingPlatform(currentProject, servingPlatformStatuses);

  const shouldShowPlatformSelection =
    servingPlatformStatuses.platformEnabledCount !== 1 && !currentProjectServingPlatform;

  const isProjectModelMesh = currentProjectServingPlatform === ServingRuntimePlatform.MULTI;

  const emptyModelServer = isProjectModelMesh
    ? servingRuntimes.length === 0
    : inferenceServices.length === 0;

  const isCurrentPlatformEnabled = isCurrentServingPlatformEnabled(
    currentProjectServingPlatform,
    servingPlatformStatuses,
  );

  const onSubmit = (submit: boolean) => {
    setPlatformSelected(undefined);
    if (submit) {
      refreshServingRuntime();
      refreshInferenceServices();
      setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
    }
  };

  const renderPlatformEmptyState = () => {
    if (kServeEnabled || modelMeshEnabled) {
      return (
        <EmptyDetailsView
          allowCreate
          iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
          imageAlt={isProjectModelMesh ? 'No model servers' : 'No deployed models'}
          title={
            isProjectModelMesh ? 'Start by adding a model server' : 'Start by deploying a model'
          }
          description={
            <Stack hasGutter>
              {errorSelectingPlatform && (
                <ModelServingPlatformSelectErrorAlert
                  error={errorSelectingPlatform}
                  clearError={() => setErrorSelectingPlatform(undefined)}
                />
              )}
              <StackItem>
                {isProjectModelMesh
                  ? 'Model servers are used to deploy models and to allow apps to send requests to your models. Configuring a model server includes specifying the number of replicas being deployed, the server size, the token authentication, the serving runtime, and how the project that the model server belongs to is accessed.\n'
                  : 'Each model is deployed on its own model server.'}
              </StackItem>
            </Stack>
          }
          createButton={
            <ModelServingPlatformButtonAction
              isProjectModelMesh={isProjectModelMesh}
              testId={`${isProjectModelMesh ? 'add-server' : 'deploy'}-button`}
              emptyTemplates={emptyTemplates}
              variant="primary"
              onClick={() => {
                setPlatformSelected(
                  isProjectModelMesh ? ServingRuntimePlatform.MULTI : ServingRuntimePlatform.SINGLE,
                );
              }}
            />
          }
          footerExtraChildren={
            deployingFromRegistry &&
            !isProjectModelMesh && ( // For modelmesh we don't want to offer this until there is a model server
              <EmptyStateActions>
                <Button
                  variant="link"
                  onClick={() =>
                    navigate(
                      modelVersionRoute(modelVersionId, registeredModelId, modelRegistryName),
                    )
                  }
                  data-testid="deploy-from-registry"
                >
                  Deploy model from model registry
                </Button>
              </EmptyStateActions>
            )
          }
        />
      );
    }

    return <EmptyModelServingPlatform />;
  };

  const renderSelectedPlatformModal = () => {
    if (!platformSelected) {
      return null;
    }

    if (platformSelected === ServingRuntimePlatform.MULTI) {
      return (
        <ManageServingRuntimeModal
          currentProject={currentProject}
          servingRuntimeTemplates={templatesEnabled.filter((template) =>
            getTemplateEnabledForPlatform(template, ServingRuntimePlatform.MULTI),
          )}
          onClose={onSubmit}
        />
      );
    }

    if (isKServeNIMEnabled) {
      return <ManageNIMServingModal projectContext={{ currentProject }} onClose={onSubmit} />;
    }

    return (
      <ManageKServeModal
        projectContext={{ currentProject, connections }}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
        )}
        onClose={onSubmit}
      />
    );
  };

  return (
    <>
      <DetailsSection
        objectType={!emptyModelServer ? ProjectObjectType.model : undefined}
        id={ProjectSectionID.MODEL_SERVER}
        title={!emptyModelServer ? ProjectSectionTitles[ProjectSectionID.MODEL_SERVER] : undefined}
        actions={
          shouldShowPlatformSelection || platformError || emptyModelServer
            ? undefined
            : [
                <ModelServingPlatformButtonAction
                  isProjectModelMesh={isProjectModelMesh}
                  testId={`${isProjectModelMesh ? 'add-server' : 'deploy'}-button`}
                  emptyTemplates={emptyTemplates}
                  onClick={() => {
                    setPlatformSelected(
                      isProjectModelMesh
                        ? ServingRuntimePlatform.MULTI
                        : ServingRuntimePlatform.SINGLE,
                    );
                  }}
                  key="serving-runtime-actions"
                />,
              ]
        }
        description={
          shouldShowPlatformSelection && emptyModelServer
            ? 'Select the model serving type to be used when deploying models from this project.'
            : undefined
        }
        popover={
          !emptyModelServer ? (
            <Popover
              headerContent="About models"
              bodyContent="Deploy models to test them and integrate them into applications. Deploying a model makes it accessible via an API, enabling you to return predictions based on data inputs."
            >
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info"
              />
            </Popover>
          ) : null
        }
        isLoading={!servingRuntimesLoaded && !templatesLoaded}
        isEmpty={shouldShowPlatformSelection}
        loadError={platformError || servingRuntimeError || templateError}
        emptyState={
          servingPlatformStatuses.platformEnabledCount > 1 ? (
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
              <FlexItem
                flex={{ default: 'flex_1' }}
                style={{ borderRight: '1px solid var(--pf-t--global--border--color--default)' }}
              >
                <EmptyDetailsView
                  iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
                  imageAlt="add a model server"
                />
              </FlexItem>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Stack hasGutter>
                  <StackItem>
                    <Content>
                      <Content component="p">
                        Select the model serving type to be used when deploying from this project.
                      </Content>
                    </Content>
                  </StackItem>
                  <StackItem>
                    <Gallery hasGutter>
                      {kServeEnabled && (
                        <GalleryItem>
                          <EmptySingleModelServingCard
                            setErrorSelectingPlatform={setErrorSelectingPlatform}
                          />
                        </GalleryItem>
                      )}
                      {modelMeshEnabled && (
                        <GalleryItem>
                          <EmptyMultiModelServingCard
                            setErrorSelectingPlatform={setErrorSelectingPlatform}
                          />
                        </GalleryItem>
                      )}
                      {isNIMAvailable && (
                        <GalleryItem>
                          <EmptyNIMModelServingCard
                            setErrorSelectingPlatform={setErrorSelectingPlatform}
                          />
                        </GalleryItem>
                      )}
                    </Gallery>
                  </StackItem>
                  {errorSelectingPlatform && (
                    <ModelServingPlatformSelectErrorAlert
                      error={errorSelectingPlatform}
                      clearError={() => setErrorSelectingPlatform(undefined)}
                    />
                  )}
                  <StackItem>
                    <Alert
                      variant="info"
                      isInline
                      isPlain
                      title="You can change the model serving type before the first model is deployed from this project. After deployment, switching types requires deleting all models and servers."
                    />
                  </StackItem>
                </Stack>
              </FlexItem>
            </Flex>
          ) : (
            <EmptyModelServingPlatform />
          )
        }
        labels={
          currentProjectServingPlatform
            ? [
                <Flex gap={{ default: 'gapSm' }} key="serving-platform-label">
                  <Label data-testid="serving-platform-label">
                    {isKServeNIMEnabled
                      ? 'NVIDIA NIM serving enabled'
                      : isCurrentPlatformEnabled
                      ? isProjectModelMesh
                        ? 'Multi-model serving enabled'
                        : 'Single-model serving enabled'
                      : 'Current platform disabled'}
                  </Label>

                  {emptyModelServer &&
                    (servingPlatformStatuses.platformEnabledCount > 1 ||
                      !isCurrentPlatformEnabled ||
                      platformError) && (
                      <ModelServingPlatformSelectButton
                        namespace={currentProject.metadata.name}
                        servingPlatform={NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}
                        setError={setErrorSelectingPlatform}
                        variant="link"
                        isInline
                        data-testid="change-serving-platform-button"
                      />
                    )}
                </Flex>,
              ]
            : undefined
        }
      >
        {emptyModelServer ? (
          renderPlatformEmptyState()
        ) : isProjectModelMesh ? (
          <ModelMeshServingRuntimeTable />
        ) : (
          <KServeInferenceServiceTable />
        )}
      </DetailsSection>
      {renderSelectedPlatformModal()}
    </>
  );
};

export default ModelServingPlatform;
