import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { createRecurringRunRoute } from '~/routes/pipelines/runs';
import {
  ExperimentContext,
  useContextExperimentArchivedOrDeleted,
} from '~/pages/pipelines/global/experiments/ExperimentContext';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

const CreateScheduleButton: React.FC = () => {
  const navigate = useNavigate();
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace } = usePipelinesAPI();
  const { isExperimentArchived } = useContextExperimentArchivedOrDeleted();
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
        onClick={() => navigate(createRecurringRunRoute(namespace, experiment?.experiment_id))}
        isAriaDisabled={isExperimentArchived}
        ref={tooltipRef}
      >
        Create schedule
      </Button>
    </>
  );
};

export default CreateScheduleButton;
