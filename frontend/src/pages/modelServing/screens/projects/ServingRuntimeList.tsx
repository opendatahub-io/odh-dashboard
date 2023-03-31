import * as React from 'react';
import { Button } from '@patternfly/react-core';
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
      data: modelServers,
      loaded,
      error: loadError,
      refresh: refreshServingRuntime,
    },
    serverSecrets: { data: secrets, refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
  } = React.useContext(ProjectDetailsContext);
  const emptyModelServer = modelServers.length === 0;
  const [expandedColumn, setExpandedColumn] = React.useState<ServingRuntimeTableTabs | undefined>();

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.MODEL_SERVER}
        title={ProjectSectionTitlesExtended[ProjectSectionID.MODEL_SERVER] || ''}
        actions={
          emptyModelServer
            ? [
                <Button
                  onClick={() => setOpen(true)}
                  key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
                  variant="secondary"
                >
                  Configure server
                </Button>,
              ]
            : undefined
        }
        isLoading={!loaded}
        isEmpty={emptyModelServer}
        loadError={loadError}
        emptyState={
          <EmptyDetailsList
            title="No model servers"
            description="Before deploying a model, you must first configure a model server."
            icon={PlusCircleIcon}
          />
        }
      >
        <ServingRuntimeTable
          modelServers={modelServers}
          modelSecrets={secrets}
          refreshServingRuntime={refreshServingRuntime}
          refreshTokens={refreshTokens}
          refreshInferenceServices={refreshInferenceServices}
          expandedColumn={expandedColumn}
          updateExpandedColumn={setExpandedColumn}
        />
      </DetailsSection>
      <ManageServingRuntimeModal
        isOpen={isOpen}
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
