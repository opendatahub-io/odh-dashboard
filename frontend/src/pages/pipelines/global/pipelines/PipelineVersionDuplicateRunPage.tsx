import React from 'react';
import { PathProps } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { pipelineVersionRunDetailsRoute, pipelineVersionRunsRoute } from '~/routes';
import DuplicateRunPage from '~/concepts/pipelines/content/createRun/DuplicateRunPage';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';

const PipelineVersionDuplicateRunPage: React.FC<PathProps> = ({ breadcrumbPath }) => {
  const { pipeline, version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();

  return (
    <DuplicateRunPage
      breadcrumbPath={breadcrumbPath}
      contextPath={pipelineVersionRunsRoute(
        namespace,
        version?.pipeline_id,
        version?.pipeline_version_id,
      )}
      contextPipeline={pipeline}
      contextPipelineVersion={version}
      detailsRedirect={(runId) =>
        pipelineVersionRunDetailsRoute(
          namespace,
          version?.pipeline_id,
          version?.pipeline_version_id,
          runId,
        )
      }
    />
  );
};

export default PipelineVersionDuplicateRunPage;
