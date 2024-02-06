import * as React from 'react';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Alert, Label, Popover } from '@patternfly/react-core';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { AccessReviewResource, ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimePlatform } from '~/types';
import ModelServingPlatformSelect from '~/pages/modelServing/screens/projects/ModelServingPlatformSelect';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import KServeInferenceServiceTable from '~/pages/modelServing/screens/projects/KServeSection/KServeInferenceServiceTable';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import emptyStateImg from '~/images/empty-state-model-serving.svg';
import EmptyDetailsView from '~/pages/projects/screens/detail/EmptyDetailsView';
import EmptySingleModelServingCard from '~/pages/modelServing/screens/projects/EmptySingleModelServingCard';
import EmptyMultiModelServingCard from '~/pages/modelServing/screens/projects/EmptyMultiModelServingCard';
import { useAccessReview } from '~/api';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ModelMeshServingRuntimeTable from './ModelMeshSection/ServingRuntimeTable';
import ModelServingPlatformButtonAction from './ModelServingPlatformButtonAction';
import ManageKServeModal from './kServeModal/ManageKServeModal';

import './ModelServingPlatform.scss';

const ModelServingPlatform: React.FC = () => {
  const [platformSelected, setPlatformSelected] = React.useState<
    ServingRuntimePlatform | undefined
  >(undefined);
  const [modalShown, setModalShown] = React.useState<boolean>(false);

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
    servingRuntimeTemplates: { data: templates, loaded: templatesLoaded, error: templateError },
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    dataConnections: { data: dataConnections },
    serverSecrets: { refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const { refresh: refreshAllProjects } = React.useContext(ProjectsContext);

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

  React.useEffect(() => {
    setPlatformSelected(
      isProjectModelMesh ? ServingRuntimePlatform.MULTI : ServingRuntimePlatform.SINGLE,
    );
  }, [isProjectModelMesh]);

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const onSubmit = (submit: boolean) => {
    setModalShown(false);
    if (submit) {
      refreshAllProjects();
      refreshServingRuntime();
      refreshInferenceServices();
      setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
    }
  };

  return (
    <>
      <DetailsSection
        typeModifier="model-server"
        iconSrc="../images/UI_icon-Red_Hat-Server-RGB.svg"
        iconAlt="Model servers"
        id={ProjectSectionID.MODEL_SERVER}
        title={ProjectSectionTitles[ProjectSectionID.MODEL_SERVER]}
        description="Select the type of model serving platform to be used when deploying models in this project."
        popover={
          <Popover
            headerContent="About model serving"
            bodyContent="Deploy a trained data science model to serve intelligent applications with an endpoint that allows apps to send requests to the model."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        }
        actions={
          shouldShowPlatformSelection || platformError
            ? [
                <ModelServingPlatformButtonAction
                  isProjectModelMesh={isProjectModelMesh}
                  emptyTemplates={emptyTemplates}
                  onClick={() => setModalShown(true)}
                  key="serving-runtime-actions"
                />,
              ]
            : undefined
        }
        isLoading={!servingRuntimesLoaded && !templatesLoaded}
        isEmpty={!shouldShowPlatformSelection && emptyModelServer}
        loadError={platformError || servingRuntimeError || templateError}
        emptyState={
          <div className="odh-model-serving-platform__empty-state">
            <div className="odh-model-serving-platform__empty-state--description">
              <EmptyDetailsView
                title="Start by adding a model server"
                description="Deploy a trained data science model to serve intelligent applications with an endpoint that allows apps to send requests to the model."
                iconImage={emptyStateImg}
                imageAlt="add a model server"
                allowCreate={false}
              />
            </div>
            <div className="odh-model-serving-platform__empty-state--platforms">
              <div className="odh-model-serving-platform__empty-state--cards">
                <EmptySingleModelServingCard allowCreate={rbacLoaded && allowCreate} />
                <EmptyMultiModelServingCard allowCreate={rbacLoaded && allowCreate} />
              </div>
              <Alert
                variant="info"
                isInline
                isPlain
                title="Your project can only support one platform"
              >
                <p>
                  Choose a platform that best fits your needs. Changes cannot be made once a model
                  has deployed.
                </p>
              </Alert>
            </div>
          </div>
        }
        labels={
          currentProjectServingPlatform && [
            <Label key="serving-platform-label">
              {isProjectModelMesh ? 'Multi-model serving enabled' : 'Single-model serving enabled'}
            </Label>,
          ]
        }
      >
        {shouldShowPlatformSelection ? (
          <ModelServingPlatformSelect
            onSelect={(selectedPlatform) => {
              setPlatformSelected(selectedPlatform);
            }}
            emptyTemplates={emptyTemplates}
            emptyPlatforms={!modelMeshEnabled && !kServeEnabled}
          />
        ) : isProjectModelMesh ? (
          <ModelMeshServingRuntimeTable />
        ) : (
          <KServeInferenceServiceTable />
        )}
      </DetailsSection>
      <ManageServingRuntimeModal
        isOpen={modalShown && platformSelected === ServingRuntimePlatform.MULTI}
        currentProject={currentProject}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.MULTI),
        )}
        onClose={(submit: boolean) => {
          onSubmit(submit);
        }}
      />
      <ManageKServeModal
        isOpen={modalShown && platformSelected === ServingRuntimePlatform.SINGLE}
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
