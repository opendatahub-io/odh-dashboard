import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Bullseye, Spinner } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import { EDGE_CONSTANT } from '~/concepts/edge/const';
import { useK8sPipelineRunTaskTopology } from '~/concepts/edge/content/topology/useK8sPipelineRunTaskTopology';
import { PipelineTopology, PipelineTopologyEmpty } from '~/concepts/topology';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import useK8sPipelinesRun from '~/pages/edge/screens/manage/useK8sPipelinesRun';
import EdgePipelineRunNotFound from '~/concepts/edge/content/pipelinesDetails/pipelineRuns/EdgePipelineRunNotFound';
import ApplicationsPage from '~/pages/ApplicationsPage';

const EdgePipelineRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { pipelineRunName } = useParams();
  const [pipelineRun, loaded, loadError] = useK8sPipelinesRun(EDGE_CONSTANT, pipelineRunName);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { taskMap, nodes } = useK8sPipelineRunTaskTopology(pipelineRun);

  if (!loaded && !loadError) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (loadError) {
    return (
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive>{'Pipeline run not found'}</BreadcrumbItem>
          </Breadcrumb>
        }
        title={'Pipeline run not found'}
        empty={false}
        loaded={true}
      >
        <EdgePipelineRunNotFound errorMessage={loadError.message} />;
      </ApplicationsPage>
    );
  }

  return (
    <ApplicationsPage
      title={loadError ? 'Error loading run' : pipelineRun?.metadata.name}
      loaded={loaded}
      loadError={loadError}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>
            {loadError ? 'Run details' : pipelineRun?.metadata.name ?? 'Loading...'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      empty={false}
    >
      {nodes.length === 0 ? (
        <PipelineTopologyEmpty />
      ) : (
        <PipelineTopology
          nodes={nodes}
          selectedIds={selectedId ? [selectedId] : []}
          onSelectionChange={(ids) => {
            const firstId = ids[0];
            if (ids.length === 0) {
              setSelectedId(null);
            } else if (taskMap[firstId]) {
              setSelectedId(firstId);
            }
          }}
        />
      )}
    </ApplicationsPage>
  );
};

export default EdgePipelineRunDetails;
