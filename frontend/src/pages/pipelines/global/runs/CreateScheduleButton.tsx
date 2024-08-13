import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { createRecurringRunRoute } from '~/routes';
import { useContextExperimentArchived } from '~/pages/pipelines/global/experiments/ExperimentContext';

const CreateScheduleButton: React.FC = () => {
  const navigate = useNavigate();
  const { namespace, experimentId, pipelineVersionId, pipelineId } = useParams();
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
          navigate(
            createRecurringRunRoute(
              namespace,
              isExperimentsAvailable ? experimentId : undefined,
              pipelineId,
              pipelineVersionId,
            ),
          )
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
