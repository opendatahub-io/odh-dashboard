import React from 'react';
import { FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core';
import { z } from 'zod';
import SimpleSelect, {
  type SimpleSelectOption,
} from '@odh-dashboard/ui-core/components/SimpleSelect';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import type { SupportedModelFormats, TemplateKind } from '@odh-dashboard/k8s-core';
import {
  getModelTypesFromTemplate,
  getServingRuntimeFromTemplate,
  getServingRuntimeNameFromTemplate,
  ServingRuntimeModelType,
} from '@odh-dashboard/model-serving/shared';
import { type ModelTypeFieldData } from './ModelTypeSelectField';
import { isUnsupportedUnaccepted } from '../../../concepts/versions';
import { useServingRuntimeTemplates } from '../../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates';

const getModelFormatLabel = (modelFormat: SupportedModelFormats): string => {
  return modelFormat.version ? `${modelFormat.name} - ${modelFormat.version}` : modelFormat.name;
};

// Schema
export const modelFormatFieldSchema = z.custom<SupportedModelFormats>((val: unknown) => {
  return !!(
    typeof val === 'object' &&
    val &&
    'name' in val &&
    typeof val.name === 'string' &&
    val.name.length > 0
  );
}, 'Model format is required for predictive models');

export type ModelFormatFieldData = z.infer<typeof modelFormatFieldSchema>;

// Hooks

export type ModelFormatState = {
  modelFormatOptions: SupportedModelFormats[];
  modelFormat?: SupportedModelFormats;
  setModelFormat: (modelFormat: SupportedModelFormats) => void;
  isVisible?: boolean;
  error?: Error;
  loaded: boolean;
  templatesFilteredForModelType?: TemplateKind[];
};

export const useModelFormatField = (
  initialModelFormat?: SupportedModelFormats,
  modelType?: ModelTypeFieldData,
  projectName?: string,
): ModelFormatState => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [servingRuntimeTemplates, servingRuntimeTemplatesLoaded, servingRuntimeTemplatesError] =
    useServingRuntimeTemplates();

  const hasDistinctProjectNamespace = !!projectName && projectName !== dashboardNamespace;

  const [projectTemplates, projectTemplatesLoaded, projectTemplatesError] =
    useServingRuntimeTemplates(hasDistinctProjectNamespace ? projectName : undefined);

  const allModelServerTemplates = React.useMemo(() => {
    if (!hasDistinctProjectNamespace) {
      return servingRuntimeTemplates;
    }
    // When project namespace differs, merge both lists and deduplicate by
    // embedded ServingRuntime name. Project-scoped templates take precedence.
    const seen = new Set<string>();
    const merged: TemplateKind[] = [];
    for (const t of projectTemplates) {
      const name = getServingRuntimeNameFromTemplate(t);
      seen.add(name);
      merged.push(t);
    }
    for (const t of servingRuntimeTemplates) {
      const name = getServingRuntimeNameFromTemplate(t);
      if (!seen.has(name)) {
        seen.add(name);
        merged.push(t);
      }
    }
    return merged;
  }, [servingRuntimeTemplates, projectTemplates, hasDistinctProjectNamespace]);

  const templatesFilteredForModelType = React.useMemo(() => {
    return allModelServerTemplates.filter((template) => {
      if (isUnsupportedUnaccepted(template)) {
        return false;
      }
      // If no model type is specified, show anyways for compatibility
      if (getModelTypesFromTemplate(template).length === 0) {
        return true;
      }
      if (!modelType) {
        return true;
      }
      const templateModelTypes = getModelTypesFromTemplate(template);
      if (templateModelTypes.some((type) => type === modelType.type)) {
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
    if (modelType?.type === ServingRuntimeModelType.GENERATIVE) {
      return {
        name: 'vLLM',
      };
    }
    return tmpModelFormat;
  }, [modelType, tmpModelFormat]);

  const handleSetModelFormat = React.useCallback(
    (newFormat: SupportedModelFormats) => setTmpModelFormat(newFormat),
    [],
  );

  return {
    modelFormatOptions,
    modelFormat,
    setModelFormat: handleSetModelFormat,
    isVisible: modelType?.type === ServingRuntimeModelType.PREDICTIVE,
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
