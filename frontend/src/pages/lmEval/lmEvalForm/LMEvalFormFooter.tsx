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
import { LmEvalFormData } from '#~/pages/lmEval/types';
import { createModelEvaluation } from '#~/api';
import { isFilledLmEvalFormData } from '#~/pages/lmEval/lmEvalForm/utils';

type LMEvalFormFooterProps = {
  data: LmEvalFormData;
  namespace: string;
};

const LMEvalFormFooter: React.FC<LMEvalFormFooterProps> = ({ data, namespace }) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [isSubmitting, setSubmitting] = React.useState(false);
  const canSubmit = isFilledLmEvalFormData(data);
  const navigate = useNavigate();

  const onCreatelmEval = async () => {
    setSubmitting(true);
    setError(null);
    createModelEvaluation(data, namespace)
      .then(() => {
        navigate('/modelEvaluations');
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
                navigate('/modelEvaluations');
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
