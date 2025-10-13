import React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { ModelServerOption } from './ModelServerTemplateSelectField';
import type { ExternalRouteField as ExternalRouteFieldType } from '../types';

// Schema
export const externalRouteFieldSchema = z.boolean();

export type ExternalRouteFieldData = z.infer<typeof externalRouteFieldSchema>;

export const isValidExternalRoute = (value: unknown): value is ExternalRouteFieldData => {
  return externalRouteFieldSchema.safeParse(value).success;
};

// Hook
export type ExternalRouteFieldHook = {
  data: ExternalRouteFieldData | undefined;
  setData: (data: ExternalRouteFieldData) => void;
  isVisible: boolean;
};

export const useExternalRouteField = (
  existingData?: ExternalRouteFieldData,
  externalRouteFields?: ExternalRouteFieldType[],
  modelType?: ServingRuntimeModelType,
  selectedModelServer?: ModelServerOption,
): ExternalRouteFieldHook => {
  const isVisible = React.useMemo(() => {
    if (!modelType || !externalRouteFields) return true;

    const extensionContext = {
      modelType,
      selectedModelServer,
    };

    const activeField = externalRouteFields.find((field) => field.isActive(extensionContext));
    return activeField?.isVisible ?? true;
  }, [externalRouteFields, modelType, selectedModelServer]);

  const [externalRouteData, setExternalRouteData] = React.useState<
    ExternalRouteFieldData | undefined
  >(existingData || false);

  React.useMemo(() => {
    if (!isVisible && externalRouteData) {
      setExternalRouteData(false);
    }
  }, [isVisible, externalRouteData]);

  return {
    data: externalRouteData,
    setData: setExternalRouteData,
    isVisible,
  };
};

// Component
type ExternalRouteFieldProps = {
  isChecked?: ExternalRouteFieldData;
  onChange?: (checked: boolean) => void;
  allowCreate?: boolean;
};

export const ExternalRouteField: React.FC<ExternalRouteFieldProps> = ({
  isChecked = false,
  onChange,
  allowCreate = false,
}) => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Checkbox
          id="alt-form-checkbox-route"
          data-testid="model-access-checkbox"
          label="Make model deployment available through an external route"
          isChecked={isChecked}
          isDisabled={!allowCreate}
          onChange={(e, check) => onChange?.(check)}
        />
      </StackItem>
    </Stack>
  );
};
