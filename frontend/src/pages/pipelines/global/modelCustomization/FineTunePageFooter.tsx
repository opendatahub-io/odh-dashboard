import { ActionList, ActionListItem, Button, Stack, StackItem } from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { createTaxonomySecret, translateIlabFormToPipelineInput } from './submitUtils';

type FineTunePageFooterProps = {
  isInvalid: boolean;
  onSuccess: () => void;
  data: ModelCustomizationFormData;
};

const FineTunePageFooter: React.FC<FineTunePageFooterProps> = ({ isInvalid, onSuccess, data }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { namespace } = usePipelinesAPI();
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
                createTaxonomySecret(data.taxonomy, namespace)
                  .then((secret) => {
                    translateIlabFormToPipelineInput(data, secret.metadata.name);
                    // return handleSubmit(formData, api);
                  })
                  .then(() => {
                    onSuccess();
                  })
                  .catch(() => {
                    //error message
                  });

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
