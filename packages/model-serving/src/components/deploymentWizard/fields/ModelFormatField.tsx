import React from 'react';
import { FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core';
import { z } from 'zod';
import SimpleSelect, {
  type SimpleSelectOption,
} from '@odh-dashboard/ui-core/components/SimpleSelect';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core';
import type { SupportedModelFormats, TemplateKind } from '@odh-dashboard/k8s-core';
import {
  getServingRuntimeFromTemplate,
  ServingRuntimeModelType,
} from '@odh-dashboard/model-serving/shared';
import { type ModelTypeFieldData } from './ModelTypeSelectField';
import { useServingRuntimeTemplates } from '../../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates';
import {
  filterTemplatesByModelType,
  mergeProjectAndGlobalTemplates,
} from '../../../concepts/servingRuntimeTemplates/templateUtils';

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
  // Model format options are only needed for predictive models. Defer Template
  // watches until then. The kserve WizardField reuses these templates when
  // predictive; generative + legacy fetches its own via externalDataHook.
  const shouldLoadTemplates = modelType?.type === ServingRuntimeModelType.PREDICTIVE;

  const [servingRuntimeTemplates, servingRuntimeTemplatesLoaded, servingRuntimeTemplatesError] =
    useServingRuntimeTemplates(undefined, shouldLoadTemplates);

  const hasDistinctProjectNamespace = !!projectName && projectName !== dashboardNamespace;

  const [projectTemplates, projectTemplatesLoaded, projectTemplatesError] =
    useServingRuntimeTemplates(
      hasDistinctProjectNamespace ? projectName : undefined,
      shouldLoadTemplates && hasDistinctProjectNamespace,
    );

  const allModelServerTemplates = React.useMemo(
    () =>
      mergeProjectAndGlobalTemplates(
        servingRuntimeTemplates,
        projectTemplates,
        hasDistinctProjectNamespace,
      ),
    [servingRuntimeTemplates, projectTemplates, hasDistinctProjectNamespace],
  );

  const templatesFilteredForModelType = React.useMemo(
    () => filterTemplatesByModelType(allModelServerTemplates, modelType?.type),
    [allModelServerTemplates, modelType?.type],
  );

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
