import * as React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  List,
  ListItem,
  Popover,
  TextArea,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';

type ServingRuntimeArgsSectionType = {
  predefinedArgs?: string[];
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
};

const ServingRuntimeArgsSection: React.FC<ServingRuntimeArgsSectionType> = ({
  predefinedArgs,
  data,
  setData,
  inputRef,
}) => (
  <FormGroup
    label="Additional serving runtime arguments"
    labelInfo={
      <Popover
        headerContent="Predefined arguments of the selected serving runtime"
        bodyContent={
          <List isPlain data-testid="predefined-args-list">
            {predefinedArgs ? (
              predefinedArgs.map((arg: string, index: number) => (
                <ListItem key={index}>{arg}</ListItem>
              ))
            ) : (
              <ListItem key="no">{`You haven't yet selected a serving runtime.`}</ListItem>
            )}
          </List>
        }
        footerContent={
          <div>
            To <strong>overrwrite</strong> a predefined argument, specify a new value in the{' '}
            <strong>Additional serving runtime arguments</strong> field.
          </div>
        }
      >
        <Button data-testid="view-predefined-args-button" variant="link">
          View predefined arguments
        </Button>
      </Popover>
    }
    labelIcon={
      <Popover
        bodyContent={
          <div>
            Serving runtime arguments define how the deployed model behaves. Overwriting predefined
            arguments only affects this model deployment.
          </div>
        }
      >
        <Icon aria-label="Additional serving runtime arguments info" role="button">
          <OutlinedQuestionCircleIcon />
        </Icon>
      </Popover>
    }
    fieldId="serving-runtime-arguments"
  >
    <TextArea
      id="serving-runtime-arguments"
      ref={inputRef}
      placeholder={`--arg\n--arg2=value2\n--arg3 value3`}
      value={data.servingRuntimeArgs?.join('\n')}
      onChange={(_e, srArgs) => setData('servingRuntimeArgs', srArgs.split('\n'))}
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
export default ServingRuntimeArgsSection;
