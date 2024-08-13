import * as React from 'react';
import { ActionsColumn, TableText, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd, TableRowTitleDescription } from '~/components/table';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelinesTableRowTime from '~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import {
  pipelineVersionCreateRecurringRunRoute,
  pipelineVersionCreateRunRoute,
  pipelineVersionDetailsRoute,
  pipelineVersionRecurringRunsRoute,
  pipelineVersionRunsRoute,
} from '~/routes';
import { isArgoWorkflow } from '~/concepts/pipelines/content/tables/utils';
import {
  PIPELINE_CREATE_RUN_TOOLTIP_ARGO_ERROR,
  PIPELINE_CREATE_SCHEDULE_TOOLTIP_ARGO_ERROR,
} from '~/concepts/pipelines/content/const';

type PipelineVersionTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  version: PipelineVersionKFv2;
  isDisabled: boolean;
  pipeline: PipelineKFv2;
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
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Create run',
              onClick: () => {
                navigate(
                  pipelineVersionCreateRunRoute(
                    namespace,
                    pipeline.pipeline_id,
                    version.pipeline_version_id,
                  ),
                );
              },
              isAriaDisabled: isCreateDisabled,
              tooltipProps: isCreateDisabled
                ? { content: PIPELINE_CREATE_RUN_TOOLTIP_ARGO_ERROR }
                : undefined,
            },
            {
              title: 'Create schedule',
              onClick: () => {
                navigate(
                  pipelineVersionCreateRecurringRunRoute(
                    namespace,
                    pipeline.pipeline_id,
                    version.pipeline_version_id,
                  ),
                );
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
              title: 'View runs',
              onClick: () => {
                navigate(
                  pipelineVersionRunsRoute(
                    namespace,
                    pipeline.pipeline_id,
                    version.pipeline_version_id,
                  ),
                );
              },
            },
            {
              title: 'View schedules',
              onClick: () => {
                navigate(
                  pipelineVersionRecurringRunsRoute(
                    namespace,
                    pipeline.pipeline_id,
                    version.pipeline_version_id,
                  ),
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
