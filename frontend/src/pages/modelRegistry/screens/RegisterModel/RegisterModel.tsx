import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Form,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { useParams, useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { modelRegistryRoute } from '#~/routes/modelRegistry/registryBase';
import { registeredModelRoute } from '#~/routes/modelRegistry/registeredModels';
import { useAppSelector } from '#~/redux/hooks';
import useRegisteredModels from '#~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import { ModelRegistryPageContext } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';
import { useRegisterModelData } from './useRegisterModelData';
import {
  isModelNameExisting,
  isNameValid,
  isRegisterModelSubmitDisabled,
  registerModel,
} from './utils';
import RegistrationCommonFormSections from './RegistrationCommonFormSections';
import PrefilledModelRegistryField from './PrefilledModelRegistryField';
import RegistrationFormFooter from './RegistrationFormFooter';
import { SubmitLabel } from './const';
import RegisterModelDetailsFormSection from './RegisterModelDetailsFormSection';

const eventName = 'Model Registered';
const RegisterModel: React.FC = () => {
  const { modelRegistry: mrName } = useParams();
  const navigate = useNavigate();
  const { apiState } = React.useContext(ModelRegistryPageContext);
  const author = useAppSelector((state) => state.user || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error | undefined>(undefined);
  const [formData, setData] = useRegisterModelData();
  const [submittedRegisteredModelName, setSubmittedRegisteredModelName] =
    React.useState<string>('');
  const [submittedVersionName, setSubmittedVersionName] = React.useState<string>('');
  const [registrationErrorType, setRegistrationErrorType] = React.useState<string | undefined>(
    undefined,
  );
  const [registeredModels, registeredModelsLoaded, registeredModelsLoadError] =
    useRegisteredModels();

  const isModelNameValid = isNameValid(formData.modelName);
  const isModelNameDuplicate = isModelNameExisting(formData.modelName, registeredModels);
  const hasModelNameError = !isModelNameValid || isModelNameDuplicate;
  const isSubmitDisabled =
    isSubmitting || isRegisterModelSubmitDisabled(formData, registeredModels);

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
        locationType: formData.modelLocationType,
      });
      navigate(registeredModelRoute(registeredModel.id, mrName));
    } else if (Object.keys(errors).length > 0) {
      fireFormTrackingEvent(eventName, {
        outcome: TrackingOutcome.submit,
        success: false,
        locationType: formData.modelLocationType,
      });
      setIsSubmitting(false);
      setSubmittedRegisteredModelName(formData.modelName);
      setSubmittedVersionName(formData.versionName);
      const resourceName = Object.keys(errors)[0];
      setRegistrationErrorType(resourceName);
      setSubmitError(errors[resourceName]);
    }
  };
  const onCancel = () => {
    fireFormTrackingEvent(eventName, { outcome: TrackingOutcome.cancel });
    navigate(modelRegistryRoute(mrName));
  };

  return (
    <ApplicationsPage
      title="Register model"
      description="Create a new model and register the first version of your new model."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={modelRegistryRoute(mrName)}>Model registry - {mrName}</Link>}
          />
          <BreadcrumbItem>Register model</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={registeredModelsLoaded}
      loadError={registeredModelsLoadError}
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Form isWidthLimited>
          <Stack hasGutter>
            <StackItem className={spacing.mbLg}>
              <PrefilledModelRegistryField mrName={mrName} />
            </StackItem>
            <StackItem>
              <RegisterModelDetailsFormSection
                formData={formData}
                setData={setData}
                hasModelNameError={hasModelNameError}
                isModelNameDuplicate={isModelNameDuplicate}
              />
              <RegistrationCommonFormSections
                formData={formData}
                setData={setData}
                isFirstVersion
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
    </ApplicationsPage>
  );
};

export default RegisterModel;
