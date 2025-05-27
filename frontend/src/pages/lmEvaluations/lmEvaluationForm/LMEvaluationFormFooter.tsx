import React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { isFilledLmEvaluationFormData } from '~/pages/lmEvaluations/utils';
import { LmEvaluationFormData } from '~/pages/lmEvaluations/types';

type LmEvaluationFormFooterProps = {
  data: LmEvaluationFormData;
};

const LmEvaluationFormFooter: React.FC<LmEvaluationFormFooterProps> = ({ data }) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [isSubmitting, setSubmitting] = React.useState(false);
  const canSubmit = isFilledLmEvaluationFormData(data);

  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert isInline variant="danger" title="Error starting InstructLab run ">
            {error.message}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              variant="primary"
              data-testid="lm-evaluation-submit-button"
              isDisabled={isSubmitting || !canSubmit}
              onClick={() => {
                setSubmitting(true);
                setError(null);
                //TODO: Implement submit function
                try {
                  // TODO: Implement submit function
                  // await submitEvaluation(data);
                } catch (err) {
                  // TODO: Implement error handling
                } finally {
                  setSubmitting(false);
                }
              }}
              isLoading={isSubmitting}
            >
              Evaluate
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="link"
              data-testid="lm-evaluation-cancel-button"
              onClick={() => {
                //TODO: Implement cancel function
              }}
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionList>
      </StackItem>
    </Stack>
  );
};
export default LmEvaluationFormFooter;
