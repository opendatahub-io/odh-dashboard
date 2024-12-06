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
import { useRegisterModelData } from './useRegisterModelData';
import { isNameValid, isRegisterModelSubmitDisabled, registerModel } from './utils';
import RegistrationCommonFormSections from './RegistrationCommonFormSections';
import { useRegistrationCommonState } from './useRegistrationCommonState';
import PrefilledModelRegistryField from './PrefilledModelRegistryField';
import RegistrationFormFooter from './RegistrationFormFooter';
import { MR_CHARACTER_LIMIT } from './const';

const RegisterModel: React.FC = () => {
  const { modelRegistry: mrName } = useParams();
  const navigate = useNavigate();

  const { isSubmitting, submitError, setSubmitError, handleSubmit, apiState, author } =
    useRegistrationCommonState();

  const [formData, setData] = useRegisterModelData();
  const isModelNameValid = isNameValid(formData.modelName);
  const isSubmitDisabled = isSubmitting || isRegisterModelSubmitDisabled(formData);
  const { modelName, modelDescription } = formData;

  const onSubmit = () =>
    handleSubmit(async () => {
      const { registeredModel } = await registerModel(apiState, formData, author);
      navigate(registeredModelUrl(registeredModel.id, mrName));
    });
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
          <RegistrationFormFooter
            submitLabel="Register model"
            submitError={submitError}
            setSubmitError={setSubmitError}
            isSubmitDisabled={isSubmitDisabled}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </Form>
      </PageSection>
    </ApplicationsPage>
  );
};

export default RegisterModel;
