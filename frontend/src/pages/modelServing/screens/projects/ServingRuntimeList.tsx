import * as React from 'react';
import { Button, Tooltip, Text } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import EmptyDetailsList from '~/pages/projects/screens/detail/EmptyDetailsList';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionTitlesExtended } from '~/pages/projects/screens/detail/const';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ServingRuntimeTable from './ServingRuntimeTable';

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
    serverSecrets: { data: secrets, refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
    currentProject,
  } = React.useContext(ProjectDetailsContext);
  const emptyModelServer = servingRuntimes.length === 0;
  const emptyTemplates = templates.length === 0;
  const [expandedColumn, setExpandedColumn] = React.useState<ServingRuntimeTableTabs | undefined>();

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.MODEL_SERVER}
        title={ProjectSectionTitlesExtended[ProjectSectionID.MODEL_SERVER] || ''}
        actions={
          emptyModelServer
            ? emptyTemplates
              ? [
                  <Tooltip
                    removeFindDomNode
                    key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
                    aria-label="Configure Server Info"
                    content={
                      <Text>
                        At least one serving runtime must be enabled to configure a model server.
                        Contact your administrator
                      </Text>
                    }
                  >
                    <Button
                      isLoading={!templatesLoaded}
                      isDisabled={!templatesLoaded || emptyTemplates}
                      onClick={() => setOpen(true)}
                      variant="secondary"
                    >
                      Configure server
                    </Button>
                  </Tooltip>,
                ]
              : [
                  <Button
                    isLoading={!templatesLoaded}
                    isDisabled={!templatesLoaded || emptyTemplates}
                    onClick={() => setOpen(true)}
                    key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
                    variant="secondary"
                  >
                    Configure server
                  </Button>,
                ]
            : undefined
        }
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
          modelSecrets={secrets}
          templates={templates}
          refreshServingRuntime={refreshServingRuntime}
          refreshTokens={refreshTokens}
          refreshInferenceServices={refreshInferenceServices}
          expandedColumn={expandedColumn}
          updateExpandedColumn={setExpandedColumn}
        />
      </DetailsSection>
      <ManageServingRuntimeModal
        isOpen={isOpen}
        currentProject={currentProject}
        servingRuntimeTemplates={templates}
        onClose={(submit: boolean) => {
          setOpen(false);
          if (submit) {
            refreshServingRuntime();
            refreshInferenceServices();
            setExpandedColumn(ServingRuntimeTableTabs.DEPLOYED_MODELS);
            setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
          }
        }}
      />
    </>
  );
};

export default ServingRuntimeList;
