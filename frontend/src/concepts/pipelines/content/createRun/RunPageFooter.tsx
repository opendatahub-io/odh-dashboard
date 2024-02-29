import * as React from 'react';
import { Alert, Button, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { RunFormData } from '~/concepts/pipelines/content/createRun/types';
import { isFilledRunFormData } from '~/concepts/pipelines/content/createRun/utils';
import { handleSubmit } from '~/concepts/pipelines/content/createRun/submitUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunSearchParam } from '~/concepts/pipelines/content/types';
import { useGetSearchParamValues } from '~/utilities/useGetSearchParamValues';
import { PipelineRunType } from '~/pages/pipelines/global/runs';

type RunPageFooterProps = {
  data: RunFormData;
  contextPath: string;
};

const RunPageFooter: React.FC<RunPageFooterProps> = ({ data, contextPath }) => {
  const { api } = usePipelinesAPI();
  const { runType } = useGetSearchParamValues([PipelineRunSearchParam.RunType]);
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const canSubmit = isFilledRunFormData(data);

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
              isDisabled={!canSubmit || isSubmitting}
              onClick={() => {
                setSubmitting(true);
                setError(null);
                handleSubmit(data, api)
                  .then((path) =>
                    navigate({
                      pathname: `${contextPath}${path}`,
                      search: `?${PipelineRunSearchParam.RunType}=${runType}`,
                    }),
                  )
                  .catch((e) => {
                    setSubmitting(false);
                    setError(e);
                  });
              }}
            >
              {`${runType === PipelineRunType.Scheduled ? 'Schedule' : 'Create'} run`}
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
