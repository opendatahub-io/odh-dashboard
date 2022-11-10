import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from '../../../projects/screens/detail/EmptyDetailsList';
import DetailsSection from '../../../projects/screens/detail/DetailsSection';
import { ProjectSectionTitlesExtended } from '../../../projects/screens/detail/const';
import { ProjectSectionID } from '../../../projects/screens/detail/types';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ProjectDetailsContext } from '../../../projects/ProjectDetailsContext';
import ManageServingRuntimeModal from './ServingRuntimeModal/ManageServingRuntimeModal';
import ManageInferenceServiceModal from './InferenceServiceModal/ManageInferenceServiceModal';
import ServingRuntimeTable from './ServingRuntimeTable';

const ModelServerList: React.FC = () => {
  const [isOpen, setOpen] = React.useState<boolean>(false);
  const {
    servingRuntimes: { data: modelServers, loaded, error: loadError, refresh },
    serverSecrets: { refresh: refreshTokens },
  } = React.useContext(ProjectDetailsContext);
  const emptyModelServer = modelServers.length === 0;
  return (
    <>
      <DetailsSection
        id={ProjectSectionID.MODEL_SERVER}
        title={ProjectSectionTitlesExtended[ProjectSectionID.MODEL_SERVER] || ''}
        actions={[
          <Button
            onClick={() => setOpen(true)}
            key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
            variant="secondary"
          >
            {emptyModelServer ? 'Configure server' : 'Deploy model'}
          </Button>,
        ]}
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
        <ServingRuntimeTable modelServers={modelServers} refresh={refresh} />
      </DetailsSection>{' '}
      {emptyModelServer && (
        <ManageServingRuntimeModal
          isOpen={isOpen}
          onClose={(submit: boolean) => {
            setOpen(false);
            if (submit) {
              refresh();
              setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
            }
          }}
        />
      )}
      {!emptyModelServer && (
        <ManageInferenceServiceModal
          isOpen={isOpen}
          onClose={(submit: boolean) => {
            setOpen(false);
            if (submit) {
              refresh();
            }
          }}
        />
      )}
    </>
  );
};

export default ModelServerList;
