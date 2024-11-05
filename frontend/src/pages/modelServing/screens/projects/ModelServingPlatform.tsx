import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  Alert,
  Button,
  EmptyStateActions,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Label,
  Popover,
  Stack,
  StackItem,
  Text,
  TextContent,
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
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import KServeInferenceServiceTable from '~/pages/modelServing/screens/projects/KServeSection/KServeInferenceServiceTable';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import EmptySingleModelServingCard from '~/pages/modelServing/screens/projects/EmptySingleModelServingCard';
import EmptyMultiModelServingCard from '~/pages/modelServing/screens/projects/EmptyMultiModelServingCard';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import EmptyModelServingPlatform from '~/pages/modelServing/screens/projects/EmptyModelServingPlatform';
import EmptyNIMModelServingCard from '~/pages/modelServing/screens/projects/EmptyNIMModelServingCard';
import { isProjectNIMSupported } from '~/pages/modelServing/screens/projects/nimUtils';
import DeployNIMServiceModal from '~/pages/modelServing/screens/projects/NIMServiceModal/DeployNIMServiceModal';
import { useDashboardNamespace } from '~/redux/selectors';
import { useIsNIMAvailable } from '~/pages/modelServing/screens/projects/useIsNIMAvailable';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import ModelServingPlatformSelectErrorAlert from '~/pages/modelServing/screens/ModelServingPlatformSelectErrorAlert';
import { modelVersionUrl } from '~/pages/modelRegistry/screens/routeUtils';
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

  const { dashboardNamespace } = useDashboardNamespace();
  const isNIMAvailable = useIsNIMAvailable(dashboardNamespace);

  const kServeEnabled = servingPlatformStatuses.kServe.enabled;
  const modelMeshEnabled = servingPlatformStatuses.modelMesh.enabled;

  const {
    servingRuntimes: {
      data: servingRuntimes,
      loaded: servingRuntimesLoaded,
      error: servingRuntimeError,
      refresh: refreshServingRuntime,
    },
    servingRuntimeTemplates: [templates, templatesLoaded, templateError],
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    dataConnections: { data: dataConnections },
    serverSecrets: { refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const isKServeNIMEnabled = isProjectNIMSupported(currentProject);

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );

  const emptyTemplates = templatesEnabled.length === 0;
  const emptyModelServer = servingRuntimes.length === 0;

  const { platform: currentProjectServingPlatform, error: platformError } =
    getProjectModelServingPlatform(currentProject, servingPlatformStatuses);

  const shouldShowPlatformSelection =
    ((kServeEnabled && modelMeshEnabled) || (!kServeEnabled && !modelMeshEnabled)) &&
    !currentProjectServingPlatform;

  const isProjectModelMesh = currentProjectServingPlatform === ServingRuntimePlatform.MULTI;

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
                    navigate(modelVersionUrl(modelVersionId, registeredModelId, modelRegistryName))
                  }
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
      return (
        <DeployNIMServiceModal
          projectContext={{ currentProject, dataConnections }}
          onClose={onSubmit}
        />
      );
    }

    return (
      <ManageKServeModal
        projectContext={{ currentProject, dataConnections }}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
        )}
        onClose={onSubmit}
      />
    );
  };

  // TODO Do we need a "Deploy model from model registry" link in the table view here?
  return (
    <>
      <DetailsSection
        objectType={!emptyModelServer ? ProjectObjectType.deployedModels : undefined}
        id={ProjectSectionID.MODEL_SERVER}
        title={!emptyModelServer ? ProjectSectionTitles[ProjectSectionID.MODEL_SERVER] : undefined}
        actions={
          shouldShowPlatformSelection || platformError || emptyModelServer
            ? undefined
            : [
                ...(!isKServeNIMEnabled
                  ? [
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
                  : []),
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
          kServeEnabled && modelMeshEnabled ? (
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
              <FlexItem
                flex={{ default: 'flex_1' }}
                style={{ borderRight: '1px solid var(--pf-v5-global--BorderColor--100)' }}
              >
                <EmptyDetailsView
                  iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
                  imageAlt="add a model server"
                />
              </FlexItem>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Stack hasGutter>
                  <StackItem>
                    <TextContent>
                      <Text>
                        Select the model serving type to be used when deploying from this project.
                      </Text>
                    </TextContent>
                  </StackItem>
                  <StackItem>
                    <Gallery hasGutter>
                      <GalleryItem>
                        <EmptySingleModelServingCard
                          setErrorSelectingPlatform={setErrorSelectingPlatform}
                        />
                      </GalleryItem>
                      <GalleryItem>
                        <EmptyMultiModelServingCard
                          setErrorSelectingPlatform={setErrorSelectingPlatform}
                        />
                      </GalleryItem>
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
                      title="The model serving type can be changed until the first model is deployed from this project. After that, if you want to use a different model serving type, you must create a new project."
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
                    {isProjectModelMesh
                      ? 'Multi-model serving enabled'
                      : 'Single-model serving enabled'}
                  </Label>
                  {emptyModelServer && (
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
