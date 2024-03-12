import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd, TableRowTitleDescription } from '~/components/table';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelinesTableRowTime from '~/concepts/pipelines/content/tables/PipelinesTableRowTime';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { routePipelineRunCreateNamespacePipelinesPage, routePipelineRunsNamespace } from '~/routes';

type PipelineVersionTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  pipelineVersionDetailsPath: (
    namespace: string,
    pipelineId: string,
    pipelineVersionId: string,
  ) => string;
  version: PipelineVersionKFv2;
  isDisabled: boolean;
  pipeline: PipelineKFv2;
  onDeleteVersion: () => void;
};

const PipelineVersionTableRow: React.FC<PipelineVersionTableRowProps> = ({
  isChecked,
  onToggleCheck,
  pipelineVersionDetailsPath,
  version,
  isDisabled,
  pipeline,
  onDeleteVersion,
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const createdDate = new Date(version.created_at);

  return (
    <Tr>
      <CheckboxTd
        id={version.pipeline_version_id}
        isChecked={isChecked}
        onToggle={onToggleCheck}
        isDisabled={isDisabled}
      />
      <Td>
        <TableRowTitleDescription
          title={
            <Link
              to={pipelineVersionDetailsPath(
                namespace,
                version.pipeline_id,
                version.pipeline_version_id,
              )}
            >
              {version.display_name}
            </Link>
          }
          description={version.description}
          descriptionAsMarkdown
          testId={`table-row-title-${version.display_name}`}
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
                navigate(routePipelineRunCreateNamespacePipelinesPage(namespace), {
                  state: { lastPipeline: pipeline, lastVersion: version },
                });
              },
            },
            {
              title: 'Schedule run',
              onClick: () => {
                navigate(
                  {
                    pathname: routePipelineRunCreateNamespacePipelinesPage(namespace),
                    search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.Scheduled}`,
                  },
                  {
                    state: { lastPipeline: pipeline, lastVersion: version },
                  },
                );
              },
            },
            {
              isSeparator: true,
            },
            {
              title: 'View runs',
              onClick: () => {
                navigate(
                  {
                    pathname: routePipelineRunsNamespace(namespace),
                    search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.Active}`,
                  },
                  {
                    state: { lastVersion: version },
                  },
                );
              },
            },
            {
              title: 'View schedules',
              onClick: () => {
                navigate(
                  {
                    pathname: routePipelineRunsNamespace(namespace),
                    search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.Scheduled}`,
                  },
                  {
                    state: { lastVersion: version },
                  },
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
