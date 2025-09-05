import React from 'react';
import { z } from 'zod';
import { FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core';
import SimpleSelect, {
  type SimpleSelectOption,
} from '@odh-dashboard/internal/components/SimpleSelect';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import {
  getModelTypesFromTemplate,
  getServingRuntimeFromTemplate,
} from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { modelTypeSelectFieldSchema, type ModelTypeFieldData } from './ModelTypeSelectField';
import { useServingRuntimeTemplates } from '../../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates';

const getModelFormatLabel = (modelFormat: SupportedModelFormats): string => {
  return modelFormat.version ? `${modelFormat.name} - ${modelFormat.version}` : modelFormat.name;
};

// Schema

export const modelFormatFieldSchema = z
  .object({
    type: modelTypeSelectFieldSchema.optional(),
    format: z.custom<SupportedModelFormats>().optional(),
  })
  .refine((data) => !(data.type === ServingRuntimeModelType.PREDICTIVE && !data.format), {
    message: 'Model format is required for predictive models',
  });

// Hooks

export type ModelFormatState = {
  modelFormatOptions: SupportedModelFormats[];
  modelFormat?: SupportedModelFormats;
  setModelFormat: (modelFormat: SupportedModelFormats) => void;
  isVisible?: boolean;
  error?: Error;
  loaded?: boolean;
};

export const useModelFormatField = (
  initialModelFormat?: SupportedModelFormats,
  modelType?: ModelTypeFieldData,
): ModelFormatState => {
  const [servingRuntimeTemplates, servingRuntimeTemplatesLoaded, servingRuntimeTemplatesError] =
    useServingRuntimeTemplates();

  const templatesFilteredForModelType = React.useMemo(() => {
    return servingRuntimeTemplates.filter((template) => {
      // If no model type is specified, show anyways for compatibility
      if (getModelTypesFromTemplate(template).length === 0) {
        return true;
      }
      if (!modelType) {
        return true;
      }
      const templateModelTypes = getModelTypesFromTemplate(template);
      if (templateModelTypes.includes(modelType)) {
        return true;
      }
      return false;
    });
  }, [servingRuntimeTemplates, modelType]);

  const modelFormatOptions = React.useMemo(() => {
    const formats: SupportedModelFormats[] = [];
    for (const template of templatesFilteredForModelType) {
      const servingRuntime = getServingRuntimeFromTemplate(template);
      if (servingRuntime?.spec.supportedModelFormats) {
        for (const format of servingRuntime.spec.supportedModelFormats) {
          if (!formats.find((f) => f.name === format.name && f.version === format.version)) {
            formats.push(format);
          }
        }
      }
    }
    return formats.toSorted((a, b) => a.name.localeCompare(b.name));
  }, [templatesFilteredForModelType]);

  const [tmpModelFormat, setModelFormat] = React.useState<SupportedModelFormats | undefined>(
    initialModelFormat,
  );

  const modelFormat = React.useMemo(() => {
    if (modelType === ServingRuntimeModelType.GENERATIVE) {
      return {
        name: 'vLLM',
      };
    }
    return tmpModelFormat;
  }, [modelType, tmpModelFormat]);

  return {
    modelFormatOptions,
    modelFormat,
    setModelFormat,
    isVisible: modelType === ServingRuntimeModelType.PREDICTIVE,
    error: servingRuntimeTemplatesError,
    loaded: servingRuntimeTemplatesLoaded,
  };
};

// Component

type ModelFormatFieldProps = {
  modelFormatState: ModelFormatState;
};

export const ModelFormatField: React.FC<ModelFormatFieldProps> = ({ modelFormatState }) => {
  const { modelFormatOptions, modelFormat, setModelFormat, isVisible, error, loaded } =
    modelFormatState;

  if (!isVisible) {
    return null;
  }

  return (
    <FormGroup label="Model framework (name - version)" fieldId="model-framework-select" isRequired>
      <SimpleSelect
        dataTestId="model-framework-select"
        toggleProps={{ id: 'model-framework-select' }}
        options={modelFormatOptions.map((framework): SimpleSelectOption => {
          const label = getModelFormatLabel(framework);
          return {
            optionKey: label,
            key: label,
            label,
          };
        })}
        isSkeleton={!loaded}
        isFullWidth
        toggleLabel={modelFormat ? getModelFormatLabel(modelFormat) : undefined}
        placeholder="Select a model format"
        value={modelFormat ? getModelFormatLabel(modelFormat) : undefined}
        onChange={(option) => {
          const [name, version] = option.split(' - ');
          setModelFormat({ name, version });
        }}
        popperProps={{ appendTo: 'inline' }}
      />
      {error && (
        <HelperText>
          <HelperTextItem variant="error">{error.message}</HelperTextItem>
        </HelperText>
      )}
    </FormGroup>
  );
};
