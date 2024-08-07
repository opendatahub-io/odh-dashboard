import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormGroup,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { useParams, useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import {
  modelRegistryUrl,
  modelVersionUrl,
  registeredModelUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import { ValueOf } from '~/typeHelpers';
import { RegistrationCommonFormData, useRegisterVersionData } from './useRegisterModelData';
import { isRegisterVersionSubmitDisabled, registerVersion } from './utils';
import RegistrationCommonFormSections from './RegistrationCommonFormSections';
import { useRegistrationCommonState } from './useRegistrationCommonState';
import PrefilledModelRegistryField from './PrefilledModelRegistryField';
import RegistrationFormFooter from './RegistrationFormFooter';
import RegisteredModelSelector from './RegisteredModelSelector';

const RegisterVersion: React.FC = () => {
  const { modelRegistry: mrName, registeredModelId: prefilledRegisteredModelId } = useParams();

  const navigate = useNavigate();

  const { isSubmitting, submitError, setSubmitError, handleSubmit, apiState, author } =
    useRegistrationCommonState();

  const [formData, setData] = useRegisterVersionData(prefilledRegisteredModelId);
  const isSubmitDisabled = isSubmitting || isRegisterVersionSubmitDisabled(formData);
  const { registeredModelId } = formData;

  const [registeredModels, loaded, loadError] = useRegisteredModels();
  const registeredModel = registeredModels.items.find(({ id }) => id === registeredModelId);

  const onSubmit = () => {
    if (!registeredModel) {
      return; // We shouldn't be able to hit this due to form validation
    }
    handleSubmit(async () => {
      const { modelVersion } = await registerVersion(apiState, registeredModel, formData, author);
      navigate(modelVersionUrl(modelVersion.id, registeredModel.id, mrName));
    });
  };
  const onCancel = () =>
    navigate(
      prefilledRegisteredModelId && registeredModel
        ? registeredModelUrl(registeredModel.id, mrName)
        : modelRegistryUrl(mrName),
    );

  return (
    <ApplicationsPage
      title="Register new version"
      description="Register a latest version to the model you selected below."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={modelRegistryUrl(mrName)}>Registered models - {mrName}</Link>}
          />
          {prefilledRegisteredModelId && registeredModel && (
            <BreadcrumbItem
              render={() => (
                <Link to={registeredModelUrl(registeredModel.id, mrName)}>
                  {registeredModel.name}
                </Link>
              )}
            />
          )}
          <BreadcrumbItem>Register new version</BreadcrumbItem>
        </Breadcrumb>
      }
      loadError={loadError}
      loaded={loaded}
      empty={false}
    >
      <PageSection variant="light" isFilled>
        <Form isWidthLimited>
          <Stack hasGutter>
            <StackItem>
              <PrefilledModelRegistryField mrName={mrName} />
            </StackItem>
            <StackItem className={spacing.mbLg}>
              <FormGroup label="Model name" isRequired fieldId="model-name">
                <RegisteredModelSelector
                  registeredModels={registeredModels.items}
                  registeredModelId={registeredModelId}
                  setRegisteredModelId={(id) => setData('registeredModelId', id)}
                  isDisabled={!!prefilledRegisteredModelId}
                />
              </FormGroup>
            </StackItem>
            <StackItem>
              <RegistrationCommonFormSections
                formData={formData}
                setData={(
                  propKey: keyof RegistrationCommonFormData,
                  propValue: ValueOf<RegistrationCommonFormData>,
                ) => setData(propKey, propValue)}
                isFirstVersion={false}
              />
            </StackItem>
          </Stack>
        </Form>
      </PageSection>
      <RegistrationFormFooter
        submitLabel="Register new version"
        submitError={submitError}
        setSubmitError={setSubmitError}
        isSubmitDisabled={isSubmitDisabled}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </ApplicationsPage>
  );
};

export default RegisterVersion;
