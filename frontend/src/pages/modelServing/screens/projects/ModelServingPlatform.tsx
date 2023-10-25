import * as React from 'react';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Label } from '@patternfly/react-core';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import {
  getSortedTemplates,
  getTemplateEnabled,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimePlatform } from '~/types';
import ModelServingPlatformSelect from '~/pages/modelServing/screens/projects/ModelServingPlatformSelect';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { useAppContext } from '~/app/AppContext';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ModelMeshServingRuntimeTable from './ModelMeshSection/ServingRuntimeTable';
import ModelServingPlatformButtonAction from './ModelServingPlatformButtonAction';

const ModelServingPlatform: React.FC = () => {
  const {
    dashboardConfig: {
      spec: {
        dashboardConfig: { disableKServe, disableModelMesh },
      },
    },
  } = useAppContext();
  const [isOpen, setOpen] = React.useState(false);

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

  const currentProjectServingPlatform = getProjectModelServingPlatform(
    currentProject,
    disableKServe,
    disableModelMesh,
  );

  const isProjectModelMesh = currentProjectServingPlatform === ServingRuntimePlatform.MULTI;

  const shouldShowPlatformSelection =
    !disableKServe && !disableModelMesh && !currentProjectServingPlatform;

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.MODEL_SERVER}
        title={ProjectSectionTitles[ProjectSectionID.MODEL_SERVER]}
        actions={
          shouldShowPlatformSelection
            ? undefined
            : [
                <ModelServingPlatformButtonAction
                  isProjectModelMesh={isProjectModelMesh}
                  emptyTemplates={emptyTemplates}
                  onClick={() => {
                    if (isProjectModelMesh) {
                      setOpen(true);
                    }
                    // else, show the kserve deploy model modal
                  }}
                  key="serving-runtime-actions"
                />,
              ]
        }
        isLoading={!servingRuntimesLoaded && !templatesLoaded}
        isEmpty={!shouldShowPlatformSelection && emptyModelServer}
        loadError={servingRuntimeError || templateError}
        emptyState={
          <EmptyDetailsList
            title={isProjectModelMesh ? 'No model servers' : 'No deployed models'}
            description={
              isProjectModelMesh
                ? 'Before deploying a model, you must first add a model server.'
                : 'To get started, deploy a model.'
            }
            icon={PlusCircleIcon}
          />
        }
        labels={
          currentProjectServingPlatform && [
            <Label key="serving-platform-label">
              {isProjectModelMesh ? 'Multi-model serving enabled' : 'Single model serving enabled'}
            </Label>,
          ]
        }
      >
        {shouldShowPlatformSelection ? (
          <ModelServingPlatformSelect
            onSelect={(selectedPlatform) => {
              if (selectedPlatform === ServingRuntimePlatform.MULTI) {
                setOpen(true);
              }
            }}
            emptyTemplates={emptyTemplates}
            // else, show the kserve deploy model modal
          />
        ) : (
          // show kserve table if `isModelMesh` is false
          <ModelMeshServingRuntimeTable />
        )}
      </DetailsSection>
      <ManageServingRuntimeModal
        isOpen={isOpen}
        currentProject={currentProject}
        servingRuntimeTemplates={templatesEnabled}
        onClose={(submit: boolean) => {
          setOpen(false);
          if (submit) {
            refreshAllProjects();
            refreshServingRuntime();
            refreshInferenceServices();
            setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
          }
        }}
      />
    </>
  );
};

export default ModelServingPlatform;
