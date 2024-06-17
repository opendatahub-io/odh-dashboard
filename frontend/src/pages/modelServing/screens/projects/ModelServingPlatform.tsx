import * as React from 'react';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  Alert,
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
import EmptyNIMModelServingCard from '~/pages/modelServing/screens/projects/EmptyNIMModelServingCard';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import EmptyModelServingPlatform from '~/pages/modelServing/screens/projects/EmptyModelServingPlatform';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ModelMeshServingRuntimeTable from './ModelMeshSection/ServingRuntimeTable';
import ModelServingPlatformButtonAction from './ModelServingPlatformButtonAction';
import ManageKServeModal from './kServeModal/ManageKServeModal';

const ModelServingPlatform: React.FC = () => {
  const [platformSelected, setPlatformSelected] = React.useState<
    ServingRuntimePlatform | undefined
  >(undefined);

  const servingPlatformStatuses = useServingPlatformStatuses();

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
          imageAlt={modelMeshEnabled ? 'No model servers' : 'No deployed models'}
          title={modelMeshEnabled ? 'Start by adding a model server' : 'Start by deploying a model'}
          description={
            modelMeshEnabled
              ? 'Model servers are used to deploy models and to allow apps to send requests to your models. Configuring a model server includes specifying the number of replicas being deployed, the server size, the token authentication, the serving runtime, and how the project that the model server belongs to is accessed.\n'
              : 'Each model is deployed on its own model server.'
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
        />
      );
    }

    return <EmptyModelServingPlatform />;
  };

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
                        <EmptySingleModelServingCard />
                      </GalleryItem>
                      <GalleryItem>
                        <EmptyMultiModelServingCard />
                      </GalleryItem>
                      <GalleryItem>
                        <EmptyNIMModelServingCard />
                      </GalleryItem>
                    </Gallery>
                  </StackItem>
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
                <Label key="serving-platform-label" data-testid="serving-platform-label">
                  {isProjectModelMesh
                    ? 'Multi-model serving enabled'
                    : 'Single-model serving enabled'}
                </Label>,
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
      <ManageServingRuntimeModal
        isOpen={platformSelected === ServingRuntimePlatform.MULTI}
        currentProject={currentProject}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.MULTI),
        )}
        onClose={(submit: boolean) => {
          onSubmit(submit);
        }}
      />
      <ManageKServeModal
        isOpen={platformSelected === ServingRuntimePlatform.SINGLE}
        projectContext={{
          currentProject,
          dataConnections,
        }}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
        )}
        onClose={(submit: boolean) => {
          onSubmit(submit);
        }}
      />
    </>
  );
};

export default ModelServingPlatform;
