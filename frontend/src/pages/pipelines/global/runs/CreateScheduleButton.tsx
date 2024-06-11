import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import { scheduleRunRoute } from '~/routes';
import { useContextExperimentArchived } from '~/pages/pipelines/global/experiments/ExperimentRunsContext';

const CreateScheduleButton: React.FC = () => {
  const navigate = useNavigate();
  const { namespace, experimentId } = useParams();
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  const isExperimentArchived = useContextExperimentArchived();
  const tooltipRef = React.useRef(null);

  return (
    <>
      {isExperimentArchived && (
        <Tooltip
          content="Schedules cannot be created unless the experiment is restored."
          triggerRef={tooltipRef}
        />
      )}
      <Button
        data-testid="schedule-run-button"
        variant="primary"
        onClick={() =>
          navigate({
            pathname: scheduleRunRoute(
              namespace,
              isExperimentsAvailable ? experimentId : undefined,
            ),
            search: `?${PipelineRunSearchParam.RunType}=${PipelineRunType.SCHEDULED}`,
          })
        }
        isAriaDisabled={isExperimentArchived}
        ref={tooltipRef}
      >
        Create schedule
      </Button>
    </>
  );
};

export default CreateScheduleButton;
