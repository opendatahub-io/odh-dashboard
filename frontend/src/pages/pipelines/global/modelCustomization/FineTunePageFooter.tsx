import { ActionList, ActionListItem, Button, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { createTeacherJudgeSecrets } from '~/pages/pipelines/global/modelCustomization/utils';

type FineTunePageFooterProps = {
  isInvalid: boolean;
  onSuccess: () => void;
  data: ModelCustomizationFormData;
};

const FineTunePageFooter: React.FC<FineTunePageFooterProps> = ({ isInvalid, onSuccess, data }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();

  const onSubmit = () =>
    createTeacherJudgeSecrets(namespace, data.teacher, data.judge).then(
      // Set teacher and judge secret names to run form parameters after they are decided
      () => undefined,
    );

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
                onSubmit()
                  .then(() => {
                    onSuccess();
                  })
                  .catch(() => {
                    // show error message
                  });
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
