import * as React from 'react';
import { Alert, Button, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { isFilledRunFormData, RunFormData } from '~/concepts/pipelines/content/createRun/types';
import { handleSubmit } from '~/concepts/pipelines/content/createRun/submitUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type RunPageFooterProps = {
  data: RunFormData;
  contextPath: string;
};

const RunPageFooter: React.FC<RunPageFooterProps> = ({ data, contextPath }) => {
  const { api } = usePipelinesAPI();
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
                  .then((path) => {
                    navigate(`${contextPath}${path}`);
                  })
                  .catch((e) => {
                    setSubmitting(false);
                    setError(e);
                  });
              }}
            >
              Create
            </Button>
          </SplitItem>
          <SplitItem>
            <Button variant="secondary" onClick={() => navigate(contextPath)}>
              Cancel
            </Button>
          </SplitItem>
        </Split>
      </StackItem>
    </Stack>
  );
};

export default RunPageFooter;
