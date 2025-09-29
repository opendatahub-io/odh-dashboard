import React from 'react';
import {
  Button,
  Checkbox,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  List,
  ListItem,
  Popover,
  Stack,
  TextArea,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';

// Schema
export const runtimeArgsFieldSchema = z.object({
  enabled: z.boolean(),
  args: z.array(z.string()),
});

export type RuntimeArgsFieldData = z.infer<typeof runtimeArgsFieldSchema>;

export const isValidRuntimeArgs = (value: unknown): value is RuntimeArgsFieldData => {
  return runtimeArgsFieldSchema.safeParse(value).success;
};

// Hook
export type RuntimeArgsFieldHook = {
  data: RuntimeArgsFieldData | undefined;
  setData: (data: RuntimeArgsFieldData) => void;
};

export const useRuntimeArgsField = (existingData?: RuntimeArgsFieldData): RuntimeArgsFieldHook => {
  const [runtimeArgsData, setRuntimeArgsData] = React.useState<RuntimeArgsFieldData | undefined>(
    existingData || { enabled: false, args: [] },
  );

  return {
    data: runtimeArgsData,
    setData: setRuntimeArgsData,
  };
};

// Component
type RuntimeArgsFieldProps = {
  data?: RuntimeArgsFieldData;
  onChange?: (data: RuntimeArgsFieldData) => void;
  allowCreate?: boolean;
  predefinedArgs?: string[];
};

export const RuntimeArgsField: React.FC<RuntimeArgsFieldProps> = ({
  data = { enabled: false, args: [] },
  onChange,
  allowCreate = false,
  predefinedArgs,
}) => {
  const handleCheckboxChange = (event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    const newData = { ...data, enabled: checked };
    onChange?.(newData);
  };

  const handleTextAreaChange = (_e: React.FormEvent<HTMLTextAreaElement>, textValue: string) => {
    const newData = { ...data, args: textValue.split('\n').filter((arg) => arg.trim() !== '') };
    onChange?.(newData);
  };

  return (
    <Stack hasGutter>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Checkbox
            id="runtime-args-checkbox"
            label="Include additional runtime arguments"
            isChecked={data.enabled}
            isDisabled={!allowCreate}
            onChange={handleCheckboxChange}
            data-testid="runtime-args-checkbox"
          />
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
        </div>
        {!predefinedArgs ? (
          <Tooltip
            data-testid="predefined-args-tooltip"
            content={<div>Select a serving runtime to view its predefined arguments</div>}
          >
            <Button
              isInline
              data-testid="view-predefined-args-button"
              variant="link"
              isAriaDisabled={!predefinedArgs}
            >
              View predefined arguments
            </Button>
          </Tooltip>
        ) : (
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
            <Button
              isInline
              data-testid="view-predefined-args-button"
              variant="link"
              isAriaDisabled={!predefinedArgs}
            >
              View predefined arguments
            </Button>
          </Popover>
        )}
      </div>

      {data.enabled && (
        <Stack>
          <TextArea
            id="runtime-args-textarea"
            data-testid="runtime-args-textarea"
            placeholder={`--arg\n--arg2=value2\n--arg3 value3`}
            value={data.args.join('\n')}
            onChange={handleTextAreaChange}
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
        </Stack>
      )}
    </Stack>
  );
};
