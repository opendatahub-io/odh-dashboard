import * as React from 'react';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  Alert,
  Content,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Label,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { ProjectSectionTitles } from '#~/pages/projects/screens/detail/const';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimePlatform } from '#~/types';
import {
  getProjectModelServingPlatform,
  isCurrentServingPlatformEnabled,
} from '#~/pages/modelServing/screens/projects/utils';
import KServeInferenceServiceTable from '#~/pages/modelServing/screens/projects/KServeSection/KServeInferenceServiceTable';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import DetailsSection from '#~/pages/projects/screens/detail/DetailsSection';
import EmptyDetailsView from '#~/components/EmptyDetailsView';
import EmptySingleModelServingCard from '#~/pages/modelServing/screens/projects/EmptySingleModelServingCard';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import EmptyModelServingPlatform from '#~/pages/modelServing/screens/projects/EmptyModelServingPlatform';
import EmptyNIMModelServingCard from '#~/pages/modelServing/screens/projects/nim/EmptyNIMModelServingCard';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nim/nimUtils';
import ManageNIMServingModal from '#~/pages/modelServing/screens/projects/nim/NIMServiceModal/ManageNIMServingModal';
import { NamespaceApplicationCase } from '#~/pages/projects/types';
import ModelServingPlatformSelectButton from '#~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import ModelServingPlatformSelectErrorAlert from '#~/concepts/modelServing/Platforms/ModelServingPlatformSelectErrorAlert';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { NavigateBackToRegistryButton } from '#~/concepts/modelServing/NavigateBackToRegistryButton.tsx';
import ModelServingPlatformButtonAction from './ModelServingPlatformButtonAction';
import ManageKServeModal from './kServeModal/ManageKServeModal';

const ModelServingPlatform: React.FC = () => {
  const [platformSelected, setPlatformSelected] = React.useState<
    ServingRuntimePlatform | undefined
  >(undefined);

  const [errorSelectingPlatform, setErrorSelectingPlatform] = React.useState<Error>();

  const servingPlatformStatuses = useServingPlatformStatuses();
  const kServeEnabled = servingPlatformStatuses.kServe.enabled;
  const isNIMAvailable = servingPlatformStatuses.kServeNIM.enabled;

  const {
    servingRuntimes: {
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

  const emptyModelServer = inferenceServices.length === 0;

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
    if (kServeEnabled) {
      return (
        <EmptyDetailsView
          allowCreate
          iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
          imageAlt="No deployed models"
          title="Start by deploying a model"
          description={
            <Stack hasGutter>
              {errorSelectingPlatform && (
                <ModelServingPlatformSelectErrorAlert
                  error={errorSelectingPlatform}
                  clearError={() => setErrorSelectingPlatform(undefined)}
                />
              )}
              <StackItem>Each model is deployed on its own model server.</StackItem>
            </Stack>
          }
          createButton={
            <ModelServingPlatformButtonAction
              testId="deploy-button"
              emptyTemplates={emptyTemplates}
              variant="primary"
              onClick={() => {
                setPlatformSelected(ServingRuntimePlatform.SINGLE);
              }}
            />
          }
          footerExtraChildren={<NavigateBackToRegistryButton isEmptyStateAction />}
        />
      );
    }

    return <EmptyModelServingPlatform />;
  };

  const renderSelectedPlatformModal = () => {
    if (!platformSelected) {
      return null;
    }

    // Now KServe-only

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
                  testId="deploy-button"
                  emptyTemplates={emptyTemplates}
                  onClick={() => {
                    setPlatformSelected(ServingRuntimePlatform.SINGLE);
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
              headerContent="About deployments"
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
                      ? 'Single-model serving enabled'
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
        {emptyModelServer ? renderPlatformEmptyState() : <KServeInferenceServiceTable />}
      </DetailsSection>
      {renderSelectedPlatformModal()}
    </>
  );
};

export default ModelServingPlatform;
