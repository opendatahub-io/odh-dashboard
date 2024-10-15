import * as React from 'react';
import { ActionsColumn, TableText, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PipelineRecurringRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { TableRowTitleDescription, CheckboxTd } from '~/components/table';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRunVersionInfo from '~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';
import { duplicateRecurringRunRoute, recurringRunDetailsRoute } from '~/routes';
import {
  RecurringRunCreated,
  RecurringRunScheduled,
  RecurringRunStatus,
  RecurringRunTrigger,
} from '~/concepts/pipelines/content/tables/renderUtils';
import PipelineRunTableRowExperiment from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowExperiment';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';

type PipelineRecurringRunTableRowProps = {
  isChecked: boolean;
  refresh: () => void;
  onToggleCheck: () => void;
  onDelete: () => void;
  recurringRun: PipelineRecurringRunKFv2;
};

const PipelineRecurringRunTableRow: React.FC<PipelineRecurringRunTableRowProps> = ({
  isChecked,
  refresh,
  onToggleCheck,
  onDelete,
  recurringRun,
}) => {
  const navigate = useNavigate();
  const { experimentId, pipelineId, pipelineVersionId } = useParams();
  const { namespace, api } = usePipelinesAPI();
  const { version, loaded, error } = usePipelineRunVersionInfo(recurringRun);
  const pipelineRecurringExperimentId = !experimentId ? recurringRun.experiment_id : '';
  const [pipelineRecurringExperiment, pipelineRecurringExperimentLoaded] = useExperimentById(
    pipelineRecurringExperimentId,
  );

  return (
    <Tr>
      <CheckboxTd
        id={recurringRun.recurring_run_id}
        isChecked={isChecked}
        onToggle={onToggleCheck}
      />
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={
            <Link
              to={recurringRunDetailsRoute(
                namespace,
                recurringRun.recurring_run_id,
                experimentId,
                pipelineId,
                pipelineVersionId,
              )}
            >
              <TableText wrapModifier="truncate">{recurringRun.display_name}</TableText>
            </Link>
          }
          description={recurringRun.description}
          descriptionAsMarkdown
        />
      </Td>
      {!experimentId && (
        <Td modifier="truncate" dataLabel="Experiment">
          <PipelineRunTableRowExperiment
            experiment={pipelineRecurringExperiment}
            loaded={pipelineRecurringExperimentLoaded}
          />
        </Td>
      )}
      {!pipelineVersionId && (
        <Td modifier="truncate" dataLabel="Pipeline">
          <PipelineVersionLink
            displayName={version?.display_name}
            version={version}
            error={error}
            loaded={loaded}
          />
        </Td>
      )}
      <Td dataLabel="Trigger">
        <RecurringRunTrigger recurringRun={recurringRun} />
      </Td>
      <Td dataLabel="Scheduled">
        <RecurringRunScheduled recurringRun={recurringRun} />
      </Td>
      <Td dataLabel="Status">
        <RecurringRunStatus
          experiment={pipelineRecurringExperiment}
          recurringRun={recurringRun}
          onToggle={(checked) =>
            api
              .updatePipelineRecurringRun({}, recurringRun.recurring_run_id, checked)
              .then(() => refresh())
          }
        />
      </Td>
      <Td dataLabel="Created">
        <RecurringRunCreated recurringRun={recurringRun} />
      </Td>
      <Td isActionCell dataLabel="Kebab">
        <ActionsColumn
          items={[
            ...(!version && experimentId
              ? []
              : [
                  {
                    title: 'Duplicate',
                    onClick: () => {
                      navigate(
                        duplicateRecurringRunRoute(
                          namespace,
                          recurringRun.recurring_run_id,
                          experimentId,
                          pipelineId,
                          pipelineVersionId,
                        ),
                      );
                    },
                  },
                  {
                    isSeparator: true,
                  },
                ]),
            {
              title: 'Delete',
              onClick: () => {
                onDelete();
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default PipelineRecurringRunTableRow;
