import React from 'react';
import { Link } from 'react-router-dom';
import { TableText } from '@patternfly/react-table';
import { TableRowTitleDescription } from '~/components/table';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { routePipelineRunDetailsNamespace } from '~/routes';
import PipelineRunTypeLabel from '~/concepts/pipelines/content/PipelineRunTypeLabel';
import PipelineJobReferenceName from '~/concepts/pipelines/content/PipelineJobReferenceName';

type PipelineRunTableRowTitleProps = {
  run: PipelineRunKFv2;
};

const PipelineRunTableRowTitle: React.FC<PipelineRunTableRowTitleProps> = ({ run }) => {
  const { namespace } = usePipelinesAPI();

  return (
    <TableRowTitleDescription
      title={
        <Link to={routePipelineRunDetailsNamespace(namespace, run.run_id)}>
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
      label={<PipelineRunTypeLabel run={run} />}
    />
  );
};
export default PipelineRunTableRowTitle;
