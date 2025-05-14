import React from 'react';
import { useParams } from 'react-router-dom';
import PipelineRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
import { BreadcrumbDetailsComponentProps } from '~/concepts/pipelines/content/types';
import { globalArchivedPipelineRunsRoute, globalPipelineRunsRoute } from '~/routes/pipelines/runs';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { StorageStateKF } from '~/concepts/pipelines/kfTypes';

const GlobalPipelineRunDetails: BreadcrumbDetailsComponentProps = ({
  breadcrumbPath,
  setHomePath,
}) => {
  const { runId } = useParams();
  const fetchedRun = usePipelineRunById(runId, true);
  const { namespace } = usePipelinesAPI();
  const [run] = fetchedRun;
  const isRunArchived = run?.storage_state === StorageStateKF.ARCHIVED;
  const contextPath = isRunArchived
    ? globalArchivedPipelineRunsRoute(namespace)
    : globalPipelineRunsRoute(namespace);

  React.useEffect(() => {
    setHomePath(contextPath);
  }, [contextPath, setHomePath]);

  return (
    <PipelineRunDetails
      breadcrumbPath={breadcrumbPath}
      contextPath={contextPath}
      fetchedRun={fetchedRun}
    />
  );
};

export default GlobalPipelineRunDetails;
