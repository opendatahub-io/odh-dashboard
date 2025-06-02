import * as React from 'react';
import { Alert, Button, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { RunFormData, RunTypeOption } from '#~/concepts/pipelines/content/createRun/types';
import { isFilledRunFormData } from '#~/concepts/pipelines/content/createRun/utils';
import { handleSubmit } from '#~/concepts/pipelines/content/createRun/submitUtils';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { isRunSchedule } from '#~/concepts/pipelines/utils';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '#~/concepts/analyticsTracking/trackingProperties';

type RunPageFooterProps = {
  data: RunFormData;
  contextPath: string;
  isValid?: boolean;
};

const eventName = 'Pipeline Run Triggered';
const RunPageFooter: React.FC<RunPageFooterProps> = ({ data, contextPath, isValid = true }) => {
  const { api } = usePipelinesAPI();
  const runType = data.runType.type;
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const canSubmit = isFilledRunFormData(data) && isValid;

  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert isInline variant="danger" title="Error creating run">
            {error.message}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <Split hasGutter>
          <SplitItem>
            <Button
              variant="primary"
              data-testid="run-page-submit-button"
              isDisabled={!canSubmit || isSubmitting}
              onClick={() => {
                setSubmitting(true);
                setError(null);
                const properties: FormTrackingEventProperties = {
                  outcome: TrackingOutcome.submit,
                  success: true,
                  type: data.runType.type,
                };

                if (data.runType.type === RunTypeOption.SCHEDULED) {
                  properties.scheduleType = data.runType.data.triggerType;
                }

                handleSubmit(data, api)
                  .then((resource) => {
                    fireFormTrackingEvent(eventName, properties);
                    const detailsPath = isRunSchedule(resource)
                      ? resource.recurring_run_id
                      : resource.run_id;

                    navigate(`${contextPath}/${detailsPath}`);
                  })
                  .catch((e) => {
                    setSubmitting(false);
                    setError(e);
                    properties.success = false;
                    properties.error = e;
                    fireFormTrackingEvent(eventName, properties);
                  });
              }}
            >
              {`Create ${runType === RunTypeOption.SCHEDULED ? 'schedule' : 'run'}`}
            </Button>
          </SplitItem>
          <SplitItem>
            <Button
              variant="secondary"
              onClick={() => {
                fireFormTrackingEvent(eventName, {
                  outcome: TrackingOutcome.cancel,
                });

                history.back();
              }}
            >
              Cancel
            </Button>
          </SplitItem>
        </Split>
      </StackItem>
    </Stack>
  );
};

export default RunPageFooter;
