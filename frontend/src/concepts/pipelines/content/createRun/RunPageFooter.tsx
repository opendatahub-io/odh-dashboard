import * as React from 'react';
import { Alert, Button, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { RunFormData } from '~/concepts/pipelines/content/createRun/types';
import {
  isFilledRunFormData,
  isFilledRunFormDataExperiment,
} from '~/concepts/pipelines/content/createRun/utils';
import { handleSubmit } from '~/concepts/pipelines/content/createRun/submitUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { useGetSearchParamValues } from '~/utilities/useGetSearchParamValues';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { isRunSchedule } from '~/concepts/pipelines/utils';
import { routePipelineRunDetails, routePipelineRunJobDetails } from '~/routes';

type RunPageFooterProps = {
  data: RunFormData;
  contextPath: string;
};

const RunPageFooter: React.FC<RunPageFooterProps> = ({ data, contextPath }) => {
  const { experimentId } = useParams();
  const { api } = usePipelinesAPI();
  const { runType } = useGetSearchParamValues([PipelineRunSearchParam.RunType]);
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  const canSubmit = isExperimentsAvailable
    ? isFilledRunFormDataExperiment(data)
    : isFilledRunFormData(data);

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
                handleSubmit(data, api)
                  .then((resource) => {
                    let detailsPath = isRunSchedule(resource)
                      ? routePipelineRunJobDetails(resource.recurring_run_id)
                      : routePipelineRunDetails(resource.run_id);

                    if (isExperimentsAvailable && experimentId) {
                      detailsPath = isRunSchedule(resource)
                        ? resource.recurring_run_id
                        : resource.run_id;
                    }

                    navigate(`${contextPath}/${detailsPath}`);
                  })
                  .catch((e) => {
                    setSubmitting(false);
                    setError(e);
                  });
              }}
            >
              {`${runType === PipelineRunType.SCHEDULED ? 'Schedule' : 'Create'} run`}
            </Button>
          </SplitItem>
          <SplitItem>
            <Button
              variant="secondary"
              onClick={() =>
                navigate({
                  pathname: contextPath,
                  search: `?${PipelineRunSearchParam.RunType}=${runType}`,
                })
              }
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
