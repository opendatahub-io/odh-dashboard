import * as React from 'react';
import { ActionsColumn, TableText, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { PipelineRecurringRunKF } from '#~/concepts/pipelines/kfTypes';
import { TableRowTitleDescription, CheckboxTd } from '#~/components/table';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePipelineRunVersionInfo from '#~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';
import { PipelineVersionLink } from '#~/concepts/pipelines/content/PipelineVersionLink';
import {
  duplicateRecurringRunRoute,
  globalPipelineRecurringRunsRoute,
  recurringRunDetailsRoute,
} from '#~/routes/pipelines/runs';
import {
  RecurringRunCreated,
  RecurringRunScheduled,
  RecurringRunStatus,
  RecurringRunTrigger,
} from '#~/concepts/pipelines/content/tables/renderUtils';
import PipelineRunTableRowExperiment from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowExperiment';
import PipelineRunTableRowMlflowExperiment from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRowMlflowExperiment';
import usePipelineRunExperimentInfo from '#~/concepts/pipelines/content/tables/usePipelineRunExperimentInfo';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { MlflowExperimentData } from '#~/concepts/mlflow/types';
import { buildLegacyExperimentFilterUrl } from '#~/concepts/pipelines/content/tables/usePipelineFilter';

type PipelineRecurringRunTableRowProps = {
  isChecked: boolean;
  refresh: () => void;
  onToggleCheck: () => void;
  onDelete: () => void;
  recurringRun: PipelineRecurringRunKF;
  mlflow: MlflowExperimentData;
};

const PipelineRecurringRunTableRow: React.FC<PipelineRecurringRunTableRowProps> = ({
  isChecked,
  refresh,
  onToggleCheck,
  onDelete,
  recurringRun,
  mlflow,
}) => {
  const navigate = useNavigate();
  const { experiment: contextExperiment } = React.useContext(ExperimentContext);
  const { namespace, api } = usePipelinesAPI();
  const {
    version,
    loaded: isVersionLoaded,
    error: versionError,
  } = usePipelineRunVersionInfo(recurringRun);
  const {
    experiment,
    loaded: isExperimentLoaded,
    error: experimentError,
  } = usePipelineRunExperimentInfo(recurringRun);
  const runGroupLink = React.useMemo(() => {
    if (!experiment) {
      return undefined;
    }

    return buildLegacyExperimentFilterUrl(
      globalPipelineRecurringRunsRoute(namespace),
      experiment.experiment_id,
    );
  }, [experiment, namespace]);

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
                contextExperiment?.experiment_id,
              )}
            >
              <TableText wrapModifier="truncate">{recurringRun.display_name}</TableText>
            </Link>
          }
          description={recurringRun.description}
          descriptionAsMarkdown
        />
      </Td>
      <Td modifier="truncate" dataLabel="Pipeline">
        <PipelineVersionLink version={version} error={versionError} loaded={isVersionLoaded} />
      </Td>
      {mlflow.isAvailable && (
        <Td dataLabel="MLflow experiment">
          <PipelineRunTableRowMlflowExperiment run={recurringRun} mlflow={mlflow} />
        </Td>
      )}
      {!contextExperiment && (
        <Td modifier="truncate" dataLabel="Run group">
          <PipelineRunTableRowExperiment
            experiment={experiment}
            error={experimentError}
            loaded={isExperimentLoaded}
            linkTo={runGroupLink}
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
          experiment={experiment}
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
      <Td isActionCell>
        <ActionsColumn
          items={[
            ...(!version
              ? []
              : [
                  {
                    title: 'Duplicate',
                    onClick: () => {
                      navigate(
                        duplicateRecurringRunRoute(
                          namespace,
                          recurringRun.recurring_run_id,
                          contextExperiment?.experiment_id,
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
