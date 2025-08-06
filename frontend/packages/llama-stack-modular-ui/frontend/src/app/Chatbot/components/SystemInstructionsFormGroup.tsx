import * as React from 'react';
import { FormGroup, TextArea, Button, ButtonVariant, Stack, Flex } from '@patternfly/react-core';

interface SystemInstructionsFormGroupProps {
  systemInstructions: string;
  onSystemInstructionsChange: (value: string) => void;
  isSystemInstructionsReadOnly: boolean;
  onEditSystemInstructions: () => void;
  onSaveSystemInstructions: () => void;
  onCancelSystemInstructions: () => void;
}

const SystemInstructionsFormGroup: React.FunctionComponent<SystemInstructionsFormGroupProps> = ({
  systemInstructions,
  onSystemInstructionsChange,
  isSystemInstructionsReadOnly,
  onEditSystemInstructions,
  onSaveSystemInstructions,
  onCancelSystemInstructions,
}) => (
  <FormGroup label="System instructions" fieldId="system-instructions">
    <Stack hasGutter>
      <TextArea
        id="system-instructions-input"
        type="text"
        value={systemInstructions}
        onChange={(_event, value) => onSystemInstructionsChange(value)}
        aria-label="System instructions input"
        {...(isSystemInstructionsReadOnly && { readOnlyVariant: 'default' })}
        rows={8}
      />
      {isSystemInstructionsReadOnly ? (
        <Button
          variant={ButtonVariant.secondary}
          aria-label="Edit system instructions"
          onClick={onEditSystemInstructions}
          style={{ marginTop: 'var(--pf-t--global--spacer--sm)', width: '100%' }}
        >
          Edit
        </Button>
      ) : (
        <Flex gap={{ default: 'gapMd' }} style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}>
          <Button
            variant={ButtonVariant.secondary}
            aria-label="Save system instructions"
            onClick={onSaveSystemInstructions}
            style={{ flex: 1 }}
          >
            Save
          </Button>
          <Button
            variant={ButtonVariant.secondary}
            aria-label="Cancel editing system instructions"
            onClick={onCancelSystemInstructions}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
        </Flex>
      )}
    </Stack>
  </FormGroup>
);

export { SystemInstructionsFormGroup };
