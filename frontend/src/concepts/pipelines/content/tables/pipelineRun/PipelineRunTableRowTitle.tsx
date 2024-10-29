import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { TableText } from '@patternfly/react-table';
import { TableRowTitleDescription } from '~/components/table';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineRunTypeLabel from '~/concepts/pipelines/content/PipelineRunTypeLabel';
import { runDetailsRoute } from '~/routes';
import PipelineRecurringRunReferenceName from '~/concepts/pipelines/content/PipelineRecurringRunReferenceName';

type PipelineRunTableRowTitleProps = {
  run: PipelineRunKF;
};

const PipelineRunTableRowTitle: React.FC<PipelineRunTableRowTitleProps> = ({ run }) => {
  const { namespace } = usePipelinesAPI();
  const { experimentId, pipelineId, pipelineVersionId } = useParams();

  return (
    <TableRowTitleDescription
      title={
        <Link
          to={runDetailsRoute(namespace, run.run_id, experimentId, pipelineId, pipelineVersionId)}
        >
          <TableText wrapModifier="truncate">{run.display_name}</TableText>
        </Link>
      }
      subtitle={
        <PipelineRecurringRunReferenceName
          runName={run.display_name}
          recurringRunId={run.recurring_run_id}
        />
      }
      description={run.description}
      descriptionAsMarkdown
      label={<PipelineRunTypeLabel run={run} isCompact />}
    />
  );
};
export default PipelineRunTableRowTitle;
