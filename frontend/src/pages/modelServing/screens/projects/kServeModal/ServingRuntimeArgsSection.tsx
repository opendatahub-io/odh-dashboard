import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  Popover,
  TextArea,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';

type ServingRuntimeArgsSectionType = {
  data?: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
};

const ServingRuntimeArgsSection: React.FC<ServingRuntimeArgsSectionType> = () => {
  const [args, setArgs] = React.useState('');

  return (
    <FormGroup
      label="Additional serving runtime arguments"
      labelIcon={
        <Popover
          bodyContent={
            <div>
              Serving runtime arguments define how the deployed model behaves. Overwriting
              predefined arguments only affects this model deployment.
            </div>
          }
        >
          <Icon aria-label="Additional serving runtime arguments info" role="button">
            <OutlinedQuestionCircleIcon />
          </Icon>
        </Popover>
      }
      fieldId="model-server-replicas"
    >
      <TextArea
        placeholder={`--arg\n--arg2=value2\n--arg3 value3`}
        value={args}
        onChange={(e) => setArgs(e.target.value)}
        autoResize
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {`Enter one argument and its values per line. Overwriting the runtime's predefined
            listening port or model location will likely result in a failed deployment.`}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default ServingRuntimeArgsSection;
