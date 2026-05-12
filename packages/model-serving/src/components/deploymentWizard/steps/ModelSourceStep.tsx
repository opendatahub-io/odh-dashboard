import React from 'react';
import { z } from 'zod';
import { Form, FormSection, Spinner } from '@patternfly/react-core';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { modelTypeSelectFieldSchema, ModelTypeSelectField } from '../fields/ModelTypeSelectField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import { ModelLocationSelectField } from '../fields/ModelLocationSelectField';
import { isValidModelLocationData } from '../fields/ModelLocationInputFields';
import { ModelLocationData, ModelLocationType } from '../types';
import { createConnectionDataSchema } from '../fields/CreateConnectionInputFields';
import type { ExternalDataMap } from '../ExternalDataLoader';
import { GenericFieldRenderer } from '../fields/GenericFieldRenderer';

// Schema
const modelLocationDataSchema = z.custom<ModelLocationData>((val) => {
  if (!val) return false;
  return isValidModelLocationData(val.type, val);
});

export const modelSourceStepBaseSchema = z.object({
  modelType: modelTypeSelectFieldSchema,
  modelLocationData: modelLocationDataSchema,
  createConnectionData: createConnectionDataSchema.optional(),
});

export const modelSourceStepRefinement = (
  data: Partial<z.infer<typeof modelSourceStepBaseSchema>> & Record<string, unknown>,
  ctx: z.RefinementCtx,
): void => {
  const locationResult = modelLocationDataSchema.safeParse(data.modelLocationData);
  if (locationResult.success && locationResult.data.type === ModelLocationType.NEW) {
    const result = createConnectionDataSchema.safeParse(data.createConnectionData);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ['createConnectionData', ...issue.path],
        });
      });
    }
  }
};

export const modelSourceStepSchema =
  modelSourceStepBaseSchema.superRefine(modelSourceStepRefinement);

export type ModelSourceStepData = z.infer<typeof modelSourceStepSchema>;

type ModelSourceStepProps = {
  wizardState: UseModelDeploymentWizardState;
  validation: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  externalData?: ExternalDataMap;
};

export const ModelSourceStepContent: React.FC<ModelSourceStepProps> = ({
  wizardState,
  validation,
  externalData,
}) => {
  const modelSourceExtensionFields = React.useMemo(
    () => wizardState.fields.filter((f) => f.step === 'modelSource'),
    [wizardState.fields],
  );

  if (!wizardState.loaded.modelSourceLoaded) {
    return <Spinner data-testid="spinner" />;
  }

  return (
    <Form>
      <FormSection title="Model details">
        <p style={{ marginTop: '-8px' }}>Provide information about the model you want to deploy.</p>
        <ModelLocationSelectField
          wizardState={wizardState}
          modelLocation={wizardState.state.modelLocationData.data?.type}
          validationProps={validation.getFieldValidationProps([
            'modelLocation',
            'modelLocationData',
          ])}
          validationIssues={validation.getFieldValidation(['modelLocation', 'modelLocationData'])}
          modelLocationData={wizardState.state.modelLocationData.data}
          setModelLocationData={wizardState.state.modelLocationData.setData}
          resetModelLocationData={() => wizardState.state.modelLocationData.setData(undefined)}
          connections={wizardState.state.modelLocationData.connections}
          setSelectedConnection={wizardState.state.modelLocationData.setSelectedConnection}
          selectedConnection={wizardState.state.modelLocationData.selectedConnection}
          pvcs={wizardState.state.modelLocationData.pvcs}
        />
        {modelSourceExtensionFields.map((field) => (
          <GenericFieldRenderer
            key={field.id}
            fieldId={field.id}
            wizardState={wizardState}
            externalData={externalData}
          />
        ))}
        <ModelTypeSelectField
          modelType={wizardState.state.modelType.data}
          setModelType={wizardState.state.modelType.setData}
          validationProps={validation.getFieldValidationProps(['modelType'])}
          validationIssues={validation.getFieldValidation(['modelType'])}
          isEditing={
            !wizardState.initialData?.modelTypeField ? false : wizardState.initialData.isEditing
          }
          externalData={wizardState.state.modelType.externalData}
        />
      </FormSection>
    </Form>
  );
};
