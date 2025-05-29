import * as React from 'react';
import { ActionsColumn, TableText, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@patternfly/react-core';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { CheckboxTd, TableRowTitleDescription } from '#~/components/table';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PipelinesTableRowTime from '#~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import {
  createRecurringRunRoute,
  createRunRoute,
  globalPipelineRecurringRunsVersionRoute,
  globalPipelineRunsVersionRoute,
} from '#~/routes/pipelines/runs';
import { pipelineVersionDetailsRoute } from '#~/routes/pipelines/global';
import { isArgoWorkflow } from '#~/concepts/pipelines/content/tables/utils';
import {
  PIPELINE_CREATE_RUN_TOOLTIP_ARGO_ERROR,
  PIPELINE_CREATE_SCHEDULE_TOOLTIP_ARGO_ERROR,
} from '#~/concepts/pipelines/content/const';

type PipelineVersionTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  version: PipelineVersionKF;
  isDisabled: boolean;
  pipeline: PipelineKF;
  onDeleteVersion: () => void;
};

const PipelineVersionTableRow: React.FC<PipelineVersionTableRowProps> = ({
  isChecked,
  onToggleCheck,
  version,
  isDisabled,
  pipeline,
  onDeleteVersion,
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const createdDate = new Date(version.created_at);
  const isCreateDisabled = isArgoWorkflow(version.pipeline_spec);

  return (
    <Tr data-testid={`pipeline-version-row ${version.pipeline_version_id}`}>
      <CheckboxTd
        id={version.pipeline_version_id}
        isChecked={isChecked}
        onToggle={onToggleCheck}
        isDisabled={isDisabled}
      />
      <Td>
        <TableRowTitleDescription
          title={
            <TableText wrapModifier="truncate">
              <Link
                to={pipelineVersionDetailsRoute(
                  namespace,
                  version.pipeline_id,
                  version.pipeline_version_id,
                )}
              >
                {version.display_name}
              </Link>
            </TableText>
          }
          description={version.description}
          descriptionAsMarkdown
        />
      </Td>
      <Td>
        <PipelinesTableRowTime date={createdDate} />
      </Td>
      <Td>
        <Button
          component="a"
          isInline
          data-testid="runs-route-link"
          variant="link"
          onClick={() =>
            navigate(globalPipelineRunsVersionRoute(namespace, version.pipeline_version_id))
          }
        >
          View runs
        </Button>
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Create run',
              onClick: () => {
                navigate(createRunRoute(namespace), {
                  state: {
                    contextData: {
                      pipeline,
                      version,
                    },
                  },
                });
              },
              isAriaDisabled: isCreateDisabled,
              tooltipProps: isCreateDisabled
                ? { content: PIPELINE_CREATE_RUN_TOOLTIP_ARGO_ERROR }
                : undefined,
            },
            {
              title: 'Create schedule',
              onClick: () => {
                navigate(createRecurringRunRoute(namespace), {
                  state: {
                    contextData: {
                      pipeline,
                      version,
                    },
                  },
                });
              },
              isAriaDisabled: isCreateDisabled,
              tooltipProps: isCreateDisabled
                ? { content: PIPELINE_CREATE_SCHEDULE_TOOLTIP_ARGO_ERROR }
                : undefined,
            },
            {
              isSeparator: true,
            },
            {
              title: 'View schedules',
              onClick: () => {
                navigate(
                  globalPipelineRecurringRunsVersionRoute(namespace, version.pipeline_version_id),
                );
              },
            },
            {
              isSeparator: true,
            },
            {
              title: 'Delete pipeline version',
              onClick: () => {
                onDeleteVersion();
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default PipelineVersionTableRow;
