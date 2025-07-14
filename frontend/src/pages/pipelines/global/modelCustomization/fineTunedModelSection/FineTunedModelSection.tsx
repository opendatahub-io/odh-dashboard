import React from 'react';
import {
  Alert,
  Checkbox,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { useLocation } from 'react-router';
import { OutputModelFormData } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import {
  FineTunePageSections,
  fineTunePageSectionTitles,
} from '#~/pages/pipelines/global/modelCustomization/const';
import { ModelCustomizationRouterState } from '#~/routes/pipelines/modelCustomization';
import FineTunedModelConnectionSection from '#~/pages/pipelines/global/modelCustomization/fineTunedModelSection/FineTunedModelConnectionSection';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import { ValidationContext } from '#~/utilities/useValidation';
import FormSection from '#~/components/pf-overrides/FormSection';

const FIELD_ID_PREFIX = 'model-customization-fineTunedModel';

type FineTunedModelSectionProps = {
  data: OutputModelFormData;
  setData: (data: OutputModelFormData) => void;
  connectionTypes: ConnectionTypeConfigMapObj[];
};

const FineTunedModelSection: React.FC<FineTunedModelSectionProps> = ({
  data,
  setData,
  connectionTypes,
}) => {
  const { state }: { state?: ModelCustomizationRouterState } = useLocation();
  const { getAllValidationIssues } = React.useContext(ValidationContext);
  const outputModelVersionValidationIssues = data.outputModelVersion
    ? getAllValidationIssues(['outputModel', 'outputModelVersion'])
    : [];

  const outputModelValidationIssues = getAllValidationIssues(['outputModel']).filter(
    (issue) => issue.path.includes('connectionData') || issue.path.includes('outputModelVersion'),
  );

  return (
    <FormSection
      id={FineTunePageSections.FINE_TUNED_MODEL_DETAILS}
      title={fineTunePageSectionTitles[FineTunePageSections.FINE_TUNED_MODEL_DETAILS]}
      description=" Configure details for the fine-tuned version of the base model."
    >
      <FormGroup
        label="Model output storage location"
        fieldId={`${FIELD_ID_PREFIX}-storage-location`}
      >
        <FineTunedModelConnectionSection
          data={data.connectionData}
          setData={(connectionData) => setData({ ...data, connectionData })}
          connectionTypes={connectionTypes}
        />
      </FormGroup>
      <Checkbox
        id={`${FIELD_ID_PREFIX}-add-model-to-registry-checkbox`}
        isChecked={data.addToRegistryEnabled}
        onChange={(_, checked) => setData({ ...data, addToRegistryEnabled: checked })}
        label={
          <>
            Add model to <strong>{state?.modelRegistryName ?? 'registry'}</strong>
          </>
        }
        body={
          data.addToRegistryEnabled && (
            <Stack hasGutter>
              <StackItem>
                <Alert
                  title={`${ODH_PRODUCT_NAME}'s model registry is a technology preview.`}
                  isInline
                  variant="info"
                />
              </StackItem>
              <StackItem>
                <FormGroup label="Model name" fieldId={`${FIELD_ID_PREFIX}-name`}>
                  {data.outputModelRegistryName ?? '-'}
                  <ZodErrorHelperText zodIssue={outputModelValidationIssues} showAllErrors />
                </FormGroup>
              </StackItem>
              <StackItem>
                <FormGroup label="Model version name" fieldId={`${FIELD_ID_PREFIX}-version`}>
                  <TextInput
                    id={`${FIELD_ID_PREFIX}-version`}
                    value={data.outputModelVersion}
                    onChange={(_event, value) => setData({ ...data, outputModelVersion: value })}
                    validated={outputModelVersionValidationIssues.length > 0 ? 'error' : 'default'}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Current version is <strong>{state?.modelVersionName}</strong>
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  <ZodErrorHelperText zodIssue={outputModelVersionValidationIssues} />
                </FormGroup>
              </StackItem>
            </Stack>
          )
        }
      />
    </FormSection>
  );
};

export default FineTunedModelSection;
