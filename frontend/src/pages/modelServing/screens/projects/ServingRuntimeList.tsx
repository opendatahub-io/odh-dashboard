import * as React from 'react';
import { PlusCircleIcon } from '@patternfly/react-icons';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionTitlesExtended } from '~/pages/projects/screens/detail/const';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getTemplateEnabled } from '~/pages/modelServing/customServingRuntimes/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ServingRuntimeTable from './ServingRuntimeTable';
import ServingRuntimeListButtonAction from './ServingRuntimeListButtonAction';

const ServingRuntimeList: React.FC = () => {
  const [isOpen, setOpen] = React.useState(false);

  const {
    servingRuntimes: {
      data: servingRuntimes,
      loaded: servingRuntimesLoaded,
      error: servingRuntimeError,
      refresh: refreshServingRuntime,
    },
    servingRuntimeTemplates: { data: templates, loaded: templatesLoaded, error: templateError },
    serverSecrets: { refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
    currentProject,
  } = React.useContext(ProjectDetailsContext);
  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const templatesEnabled = templates.filter(getTemplateEnabled);
  const emptyTemplates = templatesEnabled?.length === 0;
  const emptyModelServer = servingRuntimes.length === 0;

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.MODEL_SERVER}
        title={ProjectSectionTitlesExtended[ProjectSectionID.MODEL_SERVER] || ''}
        actions={[
          <ServingRuntimeListButtonAction
            emptyTemplates={emptyTemplates}
            emptyModelServer={emptyModelServer}
            customServingRuntimesEnabled={customServingRuntimesEnabled}
            templatesLoaded={templatesLoaded}
            onClick={() => setOpen(true)}
            key="serving-runtime-actions"
          />,
        ]}
        isLoading={!servingRuntimesLoaded && !templatesLoaded}
        isEmpty={emptyModelServer}
        loadError={servingRuntimeError || templateError}
        emptyState={
          <EmptyDetailsList
            title="No model servers"
            description="Before deploying a model, you must first configure a model server."
            icon={PlusCircleIcon}
          />
        }
      >
        <ServingRuntimeTable
          modelServers={servingRuntimes}
          refreshServingRuntime={refreshServingRuntime}
          refreshTokens={refreshTokens}
          refreshInferenceServices={refreshInferenceServices}
        />
      </DetailsSection>
      <ManageServingRuntimeModal
        isOpen={isOpen}
        currentProject={currentProject}
        servingRuntimeTemplates={customServingRuntimesEnabled ? templatesEnabled : undefined}
        onClose={(submit: boolean) => {
          setOpen(false);
          if (submit) {
            refreshServingRuntime();
            refreshInferenceServices();
            setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
          }
        }}
      />
    </>
  );
};

export default ServingRuntimeList;
