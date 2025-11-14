import React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { z } from 'zod';
import type { ModelServerSelectField } from './ModelServerTemplateSelectField';
import type { ModelTypeField } from './ModelTypeSelectField';
import { isExternalRouteField } from '../types';
import { useWizardFieldFromExtension } from '../dynamicFormUtils';

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
  modelType?: ModelTypeField,
  modelServer?: ModelServerSelectField,
): ExternalRouteFieldHook => {
  const externalRouteExtension = useWizardFieldFromExtension(isExternalRouteField, {
    modelType: { data: modelType?.data },
    modelServer: { data: modelServer?.data },
  });
  const isVisible = React.useMemo(() => {
    return externalRouteExtension?.isVisible ?? true;
  }, [externalRouteExtension]);

  const [externalRouteData, setExternalRouteData] = React.useState<
    ExternalRouteFieldData | undefined
  >(existingData || false);

  React.useEffect(() => {
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
