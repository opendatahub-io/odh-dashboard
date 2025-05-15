import React from 'react';
import { Link } from 'react-router-dom';
import { TableText } from '@patternfly/react-table';
import { TableRowTitleDescription } from '~/components/table';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineRunTypeLabel from '~/concepts/pipelines/content/PipelineRunTypeLabel';
import { runDetailsRoute } from '~/routes/pipelines/runs';
import PipelineRecurringRunReferenceName from '~/concepts/pipelines/content/PipelineRecurringRunReferenceName';
import { ExperimentContext } from '~/pages/pipelines/global/experiments/ExperimentContext';

type PipelineRunTableRowTitleProps = {
  run: PipelineRunKF;
  isModelRegistered?: boolean;
};

const PipelineRunTableRowTitle: React.FC<PipelineRunTableRowTitleProps> = ({
  run,
  isModelRegistered,
}) => {
  const { namespace } = usePipelinesAPI();
  const { experiment } = React.useContext(ExperimentContext);

  return (
    <TableRowTitleDescription
      title={
        <Link to={runDetailsRoute(namespace, run.run_id, experiment?.experiment_id)}>
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
      label={<PipelineRunTypeLabel run={run} isCompact isModelRegistered={isModelRegistered} />}
    />
  );
};
export default PipelineRunTableRowTitle;
