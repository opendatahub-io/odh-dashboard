import React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { isFilledLmEvalFormData } from '#~/pages/lmEval/utils';
import { LmEvalFormData } from '#~/pages/lmEval/types';
import { createModelEvaluation } from '#~/api';

type LMEvalFormFooterProps = {
  data: LmEvalFormData;
};

const LMEvalFormFooter: React.FC<LMEvalFormFooterProps> = ({ data }) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [isSubmitting, setSubmitting] = React.useState(false);
  const canSubmit = isFilledLmEvalFormData(data);
  const navigate = useNavigate();

  const onCreatelmEval = async () => {
    setSubmitting(true);
    setError(null);
    createModelEvaluation(data)
      .then(() => {
        navigate('/lmEval');
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert isInline variant="danger" title="Error creating evaluation">
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
              onClick={onCreatelmEval}
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
export default LMEvalFormFooter;
