import React from 'react';
import { FormGroup, Stack, StackItem } from '@patternfly/react-core';
import { trainingNodeSchema } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { useZodFormValidation } from '#~/hooks/useZodFormValidation';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';

type TrainingNodeInputProps = {
  data: number;
  setData: (data: number) => void;
};

const TrainingNodeInput: React.FC<TrainingNodeInputProps> = ({ data, setData }) => {
  const { getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    data,
    trainingNodeSchema,
  );

  return (
    <FormGroup label="Training nodes" isRequired>
      <Stack hasGutter>
        <StackItem>
          Specify the total number of nodes that will be used in the run. 1 node will be used for
          the evaluation run phase.
        </StackItem>
        <StackItem>
          <NumberInputWrapper
            data-testid="training-node"
            min={1}
            value={data}
            onChange={(value) => {
              if (typeof value === 'number') {
                setData(value);
              }
            }}
            {...getFieldValidationProps()}
          />
          <ZodErrorHelperText zodIssue={getFieldValidation()} />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default TrainingNodeInput;
