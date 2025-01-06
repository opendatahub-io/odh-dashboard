import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  PageSection,
  Stack,
  StackItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { useParams, useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import FormSection from '~/components/pf-overrides/FormSection';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { modelRegistryUrl, registeredModelUrl } from '~/pages/modelRegistry/screens/routeUtils';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { useAppSelector } from '~/redux/hooks';
import { useRegisterModelData } from './useRegisterModelData';
import { isNameValid, isRegisterModelSubmitDisabled, registerModel } from './utils';
import RegistrationCommonFormSections from './RegistrationCommonFormSections';
import PrefilledModelRegistryField from './PrefilledModelRegistryField';
import RegistrationFormFooter from './RegistrationFormFooter';
import { MR_CHARACTER_LIMIT, SubmitLabel } from './const';

const RegisterModel: React.FC = () => {
  const { modelRegistry: mrName } = useParams();
  const navigate = useNavigate();
  const { apiState } = React.useContext(ModelRegistryContext);
  const author = useAppSelector((state) => state.user || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error | undefined>(undefined);
  const [formData, setData] = useRegisterModelData();
  const isModelNameValid = isNameValid(formData.modelName);
  const isSubmitDisabled = isSubmitting || isRegisterModelSubmitDisabled(formData);
  const { modelName, modelDescription } = formData;
  const [registeredModelName, setRegisteredModelName] = React.useState<string>('');
  const [versionName, setVersionName] = React.useState<string>('');
  const [errorName, setErrorName] = React.useState<string | undefined>(undefined);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(undefined);

    const {
      data: { registeredModel, modelVersion, modelArtifact },
      errors,
    } = await registerModel(apiState, formData, author);
    if (registeredModel && modelVersion && modelArtifact) {
      navigate(registeredModelUrl(registeredModel.id, mrName));
    } else if (Object.keys(errors).length > 0) {
      setIsSubmitting(false);
      setRegisteredModelName(formData.modelName);
      setVersionName(formData.versionName);
      const resourceName = Object.keys(errors)[0];
      setErrorName(resourceName);
      setSubmitError(errors[resourceName]);
    }
  };
  const onCancel = () => navigate(modelRegistryUrl(mrName));

  return (
    <ApplicationsPage
      title="Register model"
      description="Create a new model and register the first version of your new model."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={modelRegistryUrl(mrName)}>Model registry - {mrName}</Link>}
          />
          <BreadcrumbItem>Register model</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Form isWidthLimited>
          <Stack hasGutter>
            <StackItem className={spacing.mbLg}>
              <PrefilledModelRegistryField mrName={mrName} />
            </StackItem>
            <StackItem>
              <FormSection
                title="Model details"
                description="Provide general details that apply to all versions of this model."
              >
                <FormGroup label="Model name" isRequired fieldId="model-name">
                  <TextInput
                    isRequired
                    type="text"
                    id="model-name"
                    name="model-name"
                    value={modelName}
                    onChange={(_e, value) => setData('modelName', value)}
                    validated={isModelNameValid ? 'default' : 'error'}
                  />
                  {!isModelNameValid && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem variant="error">
                          Cannot exceed {MR_CHARACTER_LIMIT} characters
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  )}
                </FormGroup>
                <FormGroup label="Model description" fieldId="model-description">
                  <TextArea
                    type="text"
                    id="model-description"
                    name="model-description"
                    value={modelDescription}
                    onChange={(_e, value) => setData('modelDescription', value)}
                  />
                </FormGroup>
              </FormSection>
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
        errorName={errorName}
        versionName={versionName}
        modelName={registeredModelName}
      />
    </ApplicationsPage>
  );
};

export default RegisterModel;
