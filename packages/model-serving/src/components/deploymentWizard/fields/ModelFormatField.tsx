import React from 'react';
import { z } from 'zod';
import { FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core';
import SimpleSelect, {
  type SimpleSelectOption,
} from '@odh-dashboard/internal/components/SimpleSelect';
import type { SupportedModelFormats, TemplateKind } from '@odh-dashboard/internal/k8sTypes';
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
    type: modelTypeSelectFieldSchema,
    format: z.custom<SupportedModelFormats>(),
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
  templatesFilteredForModelType?: TemplateKind[];
};

export const useModelFormatField = (
  initialModelFormat?: SupportedModelFormats,
  modelType?: ModelTypeFieldData,
  projectName?: string,
  onModelFormatChange?: (
    newFormat: SupportedModelFormats | undefined,
    prevFormat: SupportedModelFormats | undefined,
  ) => void,
): ModelFormatState => {
  const [servingRuntimeTemplates, servingRuntimeTemplatesLoaded, servingRuntimeTemplatesError] =
    useServingRuntimeTemplates();
  const [projectTemplates, projectTemplatesLoaded, projectTemplatesError] =
    useServingRuntimeTemplates(projectName);

  const allModelServerTemplates = React.useMemo(
    () => servingRuntimeTemplates.concat(projectTemplates),
    [servingRuntimeTemplates, projectTemplates],
  );

  const templatesFilteredForModelType = React.useMemo(() => {
    return allModelServerTemplates.filter((template) => {
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
  }, [allModelServerTemplates, modelType]);

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

  const [tmpModelFormat, setTmpModelFormat] = React.useState<SupportedModelFormats | undefined>(
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

  const handleSetModelFormat = React.useCallback(
    (newFormat: SupportedModelFormats) => {
      const prevFormat = tmpModelFormat;
      setTmpModelFormat(newFormat);
      onModelFormatChange?.(newFormat, prevFormat);
    },
    [tmpModelFormat, onModelFormatChange],
  );

  return {
    modelFormatOptions,
    modelFormat,
    setModelFormat: handleSetModelFormat,
    isVisible: modelType === ServingRuntimeModelType.PREDICTIVE,
    error: servingRuntimeTemplatesError || projectTemplatesError,
    loaded: servingRuntimeTemplatesLoaded && projectTemplatesLoaded,
    templatesFilteredForModelType,
  };
};

// Component

type ModelFormatFieldProps = {
  modelFormatState: ModelFormatState;
  isEditing?: boolean;
};

export const ModelFormatField: React.FC<ModelFormatFieldProps> = ({
  modelFormatState,
  isEditing,
}) => {
  const { modelFormatOptions, modelFormat, setModelFormat, error, loaded } = modelFormatState;

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
        isDisabled={isEditing}
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
