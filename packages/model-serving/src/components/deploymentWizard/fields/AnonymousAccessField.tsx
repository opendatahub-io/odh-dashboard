import React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { z } from 'zod';

// Schema
export const anonymousAccessFieldSchema = z.boolean();

export type AnonymousAccessFieldData = z.infer<typeof anonymousAccessFieldSchema>;

export const isValidAnonymousAccess = (value: unknown): value is AnonymousAccessFieldData => {
  return anonymousAccessFieldSchema.safeParse(value).success;
};

// Hook
export type AnonymousAccessFieldHook = {
  data: AnonymousAccessFieldData | undefined;
  setData: (data: AnonymousAccessFieldData) => void;
};

export const useAnonymousAccessField = (
  existingData?: AnonymousAccessFieldData,
): AnonymousAccessFieldHook => {
  const [anonymousAccessData, setAnonymousAccessData] = React.useState<
    AnonymousAccessFieldData | undefined
  >(existingData || false);

  return {
    data: anonymousAccessData,
    setData: setAnonymousAccessData,
  };
};

// Component
type AnonymousAccessFieldProps = {
  isChecked?: AnonymousAccessFieldData;
  onChange?: (checked: boolean) => void;
  allowCreate?: boolean;
};

export const AnonymousAccessField: React.FC<AnonymousAccessFieldProps> = ({
  isChecked = false,
  onChange,
  allowCreate = false,
}) => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Checkbox
          id="alt-form-checkbox-anonymous-access"
          data-testid="anonymous-access-checkbox"
          label="Allow anonymous access"
          isChecked={isChecked}
          isDisabled={!allowCreate}
          onChange={(e, check) => onChange?.(check)}
        />
      </StackItem>
    </Stack>
  );
};
