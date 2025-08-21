import { Form, FormGroup, PageSection, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import {
  ModelLocationType,
  useRegisterCatalogModelData,
  RegisterCatalogModelFormData,
  registerModelFormDataDefaultsForModelCatalog,
} from '#~/pages/modelRegistry/screens/RegisterModel/useRegisterModelData';
import RegistrationCommonFormSections from '#~/pages/modelRegistry/screens/RegisterModel/RegistrationCommonFormSections';
import {
  isModelNameExisting,
  isNameValid,
  isRegisterCatalogModelSubmitDisabled,
  registerModel,
} from '#~/pages/modelRegistry/screens/RegisterModel/utils';
import { SubmitLabel } from '#~/pages/modelRegistry/screens/RegisterModel/const';
import RegisterModelDetailsFormSection from '#~/pages/modelRegistry/screens/RegisterModel/RegisterModelDetailsFormSection';
import RegistrationFormFooter from '#~/pages/modelRegistry/screens/RegisterModel/RegistrationFormFooter';
import { getCatalogModelDetailsRoute } from '#~/routes/modelCatalog/catalogModelDetails';
import { registeredModelRoute } from '#~/routes/modelRegistry/registeredModels';
import { useAppSelector } from '#~/redux/hooks';
import { CatalogModel } from '#~/concepts/modelCatalog/types';
import { createCustomPropertiesFromModel, getTagFromModel } from '#~/pages/modelCatalog/utils';
import { ModelRegistryMetadataType, RegisteredModelList } from '#~/concepts/modelRegistry/types';
import { CatalogModelDetailsParams } from '#~/pages/modelCatalog/types';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import { catalogParamsToModelSourceProperties } from '#~/concepts/modelRegistry/utils';
import { ServiceKind } from '#~/k8sTypes';
import { ModelRegistryAPIState } from '#~/concepts/modelRegistry/context/useModelRegistryAPIState';
import ModelRegistrySelector from '#~/concepts/modelRegistry/content/ModelRegistrySelector.tsx';

interface RegisterCatalogModelFormProps {
  model: CatalogModel;
  decodedParams: CatalogModelDetailsParams;
  preferredModelRegistry: ServiceKind | null;
  registeredModels: RegisteredModelList;
  apiState: ModelRegistryAPIState;
}

const RegisterCatalogModelForm: React.FC<RegisterCatalogModelFormProps> = ({
  model,
  decodedParams,
  preferredModelRegistry,
  registeredModels,
  apiState,
}) => {
  const navigate = useNavigate();
  const params = useParams<CatalogModelDetailsParams>();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error | undefined>(undefined);
  const labels = createCustomPropertiesFromModel(model);
  const sourceProperties = catalogParamsToModelSourceProperties(decodedParams);

  const initialFormData: RegisterCatalogModelFormData = {
    ...registerModelFormDataDefaultsForModelCatalog,
    modelName: `${model.name}-${getTagFromModel(model) || ''}`,
    modelDescription: model.longDescription?.replace(/\s*\n\s*/g, ' ') ?? '',
    versionName: 'Version 1',
    modelLocationType: ModelLocationType.URI,
    modelLocationURI: model.artifacts?.map((artifact) => artifact.uri)[0] || '',
    modelRegistry: preferredModelRegistry?.metadata.name || '',
    additionalArtifactProperties: sourceProperties,
    modelCustomProperties: labels,
    versionCustomProperties: {
      ...labels,
      License: {
        // eslint-disable-next-line camelcase
        string_value: model.licenseLink || '',
        metadataType: ModelRegistryMetadataType.STRING,
      },
      Provider: {
        // eslint-disable-next-line camelcase
        string_value: model.provider ?? '',
        metadataType: ModelRegistryMetadataType.STRING,
      },
      'Registered from': {
        // eslint-disable-next-line camelcase
        string_value: 'Model catalog',
        metadataType: ModelRegistryMetadataType.STRING,
      },
      'Source model': {
        // eslint-disable-next-line camelcase
        string_value: model.name,
        metadataType: ModelRegistryMetadataType.STRING,
      },
      'Source model version': {
        // eslint-disable-next-line camelcase
        string_value: model.artifacts?.[0]?.tags?.[0] ?? '',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    },
  };

  const [formData, setData] = useRegisterCatalogModelData(initialFormData);

  const [submittedRegisteredModelName, setSubmittedRegisteredModelName] =
    React.useState<string>('');
  const [submittedVersionName, setSubmittedVersionName] = React.useState<string>('');
  const [registrationErrorType, setRegistrationErrorType] = React.useState<string | undefined>(
    undefined,
  );

  const isModelNameValid = isNameValid(formData.modelName);
  const eventName = 'Catalog Model Registered';

  const isModelNameDuplicate = isModelNameExisting(formData.modelName, registeredModels);
  const hasModelNameError = !isModelNameValid || isModelNameDuplicate;

  const isSubmitDisabled =
    isSubmitting || isRegisterCatalogModelSubmitDisabled(formData, registeredModels);

  const author = useAppSelector((state) => state.user || '');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(undefined);

    const {
      data: { registeredModel, modelVersion, modelArtifact },
      errors,
    } = await registerModel(apiState, formData, author);
    if (registeredModel && modelVersion && modelArtifact) {
      fireFormTrackingEvent(eventName, {
        outcome: TrackingOutcome.submit,
        success: true,
        model: params.modelName,
      });
      navigate(registeredModelRoute(registeredModel.id, preferredModelRegistry?.metadata.name));
    } else if (Object.keys(errors).length > 0) {
      setIsSubmitting(false);
      setSubmittedRegisteredModelName(formData.modelName);
      setSubmittedVersionName(formData.versionName);
      const resourceName = Object.keys(errors)[0];
      setRegistrationErrorType(resourceName);
      setSubmitError(errors[resourceName]);
      fireFormTrackingEvent(eventName, {
        outcome: TrackingOutcome.submit,
        success: false,
        error: errors[resourceName]?.message,
        model: params.modelName,
      });
    }
  };

  const onCancel = () => {
    fireFormTrackingEvent(eventName, { outcome: TrackingOutcome.cancel, model: params.modelName });
    navigate(getCatalogModelDetailsRoute(params));
  };

  return (
    <>
      <PageSection hasBodyWrapper={false} isFilled>
        <Form isWidthLimited>
          <Stack hasGutter>
            <StackItem className={spacing.mbLg}>
              <FormGroup
                id="model-registry-container"
                label="Model registry"
                isRequired
                fieldId="model-registry-name"
              >
                <ModelRegistrySelector
                  modelRegistry={formData.modelRegistry}
                  onSelection={(mr) => setData('modelRegistry', mr)}
                  primary
                  isFullWidth
                  hasError={false}
                />
              </FormGroup>
            </StackItem>
            <StackItem>
              <RegisterModelDetailsFormSection
                formData={formData}
                setData={setData}
                hasModelNameError={hasModelNameError}
                isModelNameDuplicate={isModelNameDuplicate}
                registeredModelsLoaded
                registeredModelsLoadError={undefined}
              />
              <RegistrationCommonFormSections
                formData={formData}
                setData={setData}
                isFirstVersion={false}
                isCatalogModel
              />
            </StackItem>
          </Stack>
        </Form>
      </PageSection>
      <RegistrationFormFooter
        submitLabel={SubmitLabel.REGISTER_MODEL}
        submitError={submitError}
        isSubmitDisabled={isSubmitDisabled}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        registrationErrorType={registrationErrorType}
        versionName={submittedVersionName}
        modelName={submittedRegisteredModelName}
      />
    </>
  );
};

export default RegisterCatalogModelForm;
