import React from 'react';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  List,
  ListItem,
  Popover,
  Stack,
  TextArea,
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

/**
 * Drops blank lines and `#` comment headers before writing args onto a container.
 * Comment lines are useful in the wizard textarea but are not valid container argv.
 */
export const filterRuntimeArgsForContainer = (args: string[]): string[] =>
  args.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('#');
  });

// Hook
export type RuntimeArgsFieldHook = {
  data: RuntimeArgsFieldData | undefined;
  setData: React.Dispatch<React.SetStateAction<RuntimeArgsFieldData | undefined>>;
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
  predefinedArgs?: string[];
};

export const RuntimeArgsField: React.FC<RuntimeArgsFieldProps> = ({
  data = { enabled: false, args: [] },
  onChange,
  predefinedArgs,
}) => {
  const hasTyped = React.useRef(false);
  const joined = data.args.join('\n');
  const displayValue = data.args.length > 0 && !hasTyped.current ? `${joined}\n` : joined;
  const handleTextAreaChange = (_e: React.FormEvent<HTMLTextAreaElement>, textValue: string) => {
    hasTyped.current = true;
    const args = textValue.split('\n');
    const newData = { args, enabled: args.some((a) => a.trim().length > 0) };
    onChange?.(newData);
  };

  return (
    <Stack hasGutter>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            id="runtime-args-label"
            className="pf-v6-u-font-weight-bold"
            data-testid="runtime-args-label"
          >
            Additional runtime arguments
          </span>
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
        <Popover
          headerContent="Predefined arguments of the selected serving runtime"
          bodyContent={
            <List isPlain data-testid="predefined-args-list">
              {!predefinedArgs || predefinedArgs.length === 0 ? (
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
      </div>

      <Stack>
        <TextArea
          id="runtime-args-textarea"
          data-testid="runtime-args-textarea"
          aria-labelledby="runtime-args-label"
          placeholder={`--arg\n--arg2=value2\n--arg3 value3`}
          value={displayValue}
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
    </Stack>
  );
};
