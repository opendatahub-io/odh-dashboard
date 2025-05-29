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
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingInferenceServiceObject } from '#~/pages/modelServing/screens/types';

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
}) => {
  const servingRuntimeArgsLabelInfo = () => {
    const button = (
      <Button
        isInline
        data-testid="view-predefined-args-button"
        variant="link"
        isAriaDisabled={!predefinedArgs}
      >
        View predefined arguments
      </Button>
    );
    if (!predefinedArgs) {
      return (
        <Tooltip
          data-testid="predefined-args-tooltip"
          content={<div>Select a serving runtime to view its predefined arguments</div>}
        >
          {button}
        </Tooltip>
      );
    }
    return (
      <Popover
        headerContent="Predefined arguments of the selected serving runtime"
        bodyContent={
          <List isPlain data-testid="predefined-args-list">
            {!predefinedArgs.length ? (
              <ListItem key="0">No predefined arguments</ListItem>
            ) : (
              predefinedArgs.map((arg: string, index: number) => (
                <ListItem key={index}>{arg}</ListItem>
              ))
            )}
          </List>
        }
        footerContent={
          <div>
            To <strong>overwrite</strong> a predefined argument, specify a new value in the{' '}
            <strong>Additional serving runtime arguments</strong> field.
          </div>
        }
      >
        {button}
      </Popover>
    );
  };

  return (
    <FormGroup
      label="Additional serving runtime arguments"
      labelInfo={servingRuntimeArgsLabelInfo()}
      labelHelp={
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
      fieldId="serving-runtime-arguments"
    >
      <TextArea
        id="serving-runtime-arguments"
        ref={inputRef}
        data-testid="serving-runtime-arguments-input"
        placeholder={`--arg\n--arg2=value2\n--arg3 value3`}
        value={data.servingRuntimeArgs?.join('\n')}
        onChange={(_e, srArgs) => setData('servingRuntimeArgs', srArgs.split('\n'))}
        autoResize
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {`Overwriting the runtime's predefined listening port or
            model location will likely result in a failed deployment.`}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};
export default ServingRuntimeArgsSection;
