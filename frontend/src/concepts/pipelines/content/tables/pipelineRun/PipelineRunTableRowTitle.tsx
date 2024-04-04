import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { TableText } from '@patternfly/react-table';
import { TableRowTitleDescription } from '~/components/table';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineRunTypeLabel from '~/concepts/pipelines/content/PipelineRunTypeLabel';
import PipelineJobReferenceName from '~/concepts/pipelines/content/PipelineJobReferenceName';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { runDetailsRoute } from '~/routes';

type PipelineRunTableRowTitleProps = {
  run: PipelineRunKFv2;
};

const PipelineRunTableRowTitle: React.FC<PipelineRunTableRowTitleProps> = ({ run }) => {
  const { namespace } = usePipelinesAPI();
  const { experimentId } = useParams();
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;

  return (
    <TableRowTitleDescription
      title={
        <Link
          to={runDetailsRoute(
            namespace,
            run.run_id,
            isExperimentsAvailable ? experimentId : undefined,
          )}
        >
          <TableText wrapModifier="truncate">{run.display_name}</TableText>
        </Link>
      }
      subtitle={
        <PipelineJobReferenceName
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
