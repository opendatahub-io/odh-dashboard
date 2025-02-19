import { ActionList, ActionListItem, Button, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

type FineTunePageFooterProps = {
  isInvalid: boolean;
  onSuccess: () => void;
};

const FineTunePageFooter: React.FC<FineTunePageFooterProps> = ({ isInvalid, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const navigate = useNavigate();

  return (
    <Stack hasGutter>
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              variant="primary"
              data-testid="model-customization-submit-button"
              isDisabled={isInvalid || isSubmitting}
              onClick={() => {
                setIsSubmitting(true);
                onSuccess();
                setIsSubmitting(false);
              }}
              isLoading={isSubmitting}
            >
              Start run
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="link"
              onClick={() => {
                navigate('/modelCustomization');
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

export default FineTunePageFooter;
