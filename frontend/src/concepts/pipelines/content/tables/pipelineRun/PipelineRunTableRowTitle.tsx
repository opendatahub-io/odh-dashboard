import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { TableText } from '@patternfly/react-table';
import { TableRowTitleDescription } from '~/components/table';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunLabels } from '~/concepts/pipelines/content/tables/utils';
import { routePipelineRunDetailsNamespace } from '~/routes';

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
      description={run.description}
      descriptionAsMarkdown
      label={
        <Tooltip content="Run once immediately after creation">
          <Label color="blue" isCompact>
            {PipelineRunLabels.ONEOFF}
          </Label>
        </Tooltip>
      }
    />
  );
};
export default PipelineRunTableRowTitle;
