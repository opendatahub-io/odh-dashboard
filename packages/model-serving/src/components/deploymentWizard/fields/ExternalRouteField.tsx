import React from 'react';
import { FormGroup, Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { z } from 'zod';

// Schema
export const externalRouteFieldSchema = z.object({
  externalRoute: z.boolean(),
});

export type ExternalRouteFieldData = z.infer<typeof externalRouteFieldSchema>;

export const isValidExternalRoute = (value: unknown): value is ExternalRouteFieldData => {
  return externalRouteFieldSchema.safeParse(value).success;
};

// Hook
export type ExternalRouteFieldHook = {
  data: ExternalRouteFieldData | undefined;
  setData: (data: ExternalRouteFieldData) => void;
};

export const useExternalRouteField = (
  existingData?: ExternalRouteFieldData,
): ExternalRouteFieldHook => {
  const [externalRouteData, setExternalRouteData] = React.useState<
    ExternalRouteFieldData | undefined
  >(existingData || { externalRoute: false });

  return {
    data: externalRouteData,
    setData: setExternalRouteData,
  };
};

// Component
type ExternalRouteFieldProps = {
  data?: ExternalRouteFieldData;
  onChange?: (checked: boolean) => void;
  allowCreate?: boolean;
};

export const ExternalRouteField: React.FC<ExternalRouteFieldProps> = ({
  data = { externalRoute: false },
  onChange,
  allowCreate = true,
}) => {
  const handleChange = (checked: boolean) => {
    onChange?.(checked);
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup fieldId="model-access" label="External route">
          <Checkbox
            id="alt-form-checkbox-route"
            data-testid="model-access-checkbox"
            label="Make model deployment available through an external route"
            isChecked={data.externalRoute}
            isDisabled={!allowCreate}
            onChange={(e, check) => handleChange(check)}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};
