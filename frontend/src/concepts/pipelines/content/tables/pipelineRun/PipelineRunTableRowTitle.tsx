import React from 'react';
import { Skeleton } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { TableText } from '@patternfly/react-table';
import { TableRowTitleDescription } from '~/components/table';
import { PipelineCoreResourceKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineJobReferenceName from '~/concepts/pipelines/content/PipelineJobReferenceName';
import PipelineRunTypeLabel from '~/concepts/pipelines/content/PipelineRunTypeLabel';

type PipelineRunTableRowTitleProps = {
  resource: PipelineCoreResourceKF;
};

const PipelineRunTableRowTitle: React.FC<PipelineRunTableRowTitleProps> = ({ resource }) => {
  const { namespace, getJobInformation } = usePipelinesAPI();
  const { data, loading } = getJobInformation(resource);

  return (
    <div>
      {loading ? (
        <Skeleton />
      ) : (
        <TableRowTitleDescription
          title={
            <Link to={`/pipelineRuns/${namespace}/pipelineRun/view/${resource.id}`}>
              <TableText wrapModifier="truncate">{resource.name}</TableText>
            </Link>
          }
          subtitle={<PipelineJobReferenceName resource={resource} />}
          description={data ? data.description : resource.description}
          descriptionAsMarkdown
          label={<PipelineRunTypeLabel resource={resource} isCompact />}
        />
      )}
    </div>
  );
};
export default PipelineRunTableRowTitle;
