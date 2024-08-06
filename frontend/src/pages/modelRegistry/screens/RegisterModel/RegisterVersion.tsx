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

const RegisterVersion: React.FC = () => {
  const { modelRegistry: mrName, registeredModelId: prefilledRegisteredModelId } = useParams();

  const navigate = useNavigate();

  const { isSubmitting, submitError, setSubmitError, handleSubmit, apiState, author } =
    useRegistrationCommonState();

  const [registeredModels, loaded, loadError] = useRegisteredModels();
  const registeredModel = registeredModels.items.find(({ id }) => id === registeredModelId);

  const [formData, setData] = useRegisterVersionData(prefilledRegisteredModelId);
  const { registeredModelId } = formData;
  const isSubmitDisabled =
    isSubmitting || !registeredModel || isRegisterVersionSubmitDisabled(formData);

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
            <StackItem className={spacing.mbLg}>
              <PrefilledModelRegistryField mrName={mrName} />
              <FormGroup label="Model name" isRequired fieldId="model-name">
                {/* // TODO: typeahead select here, or disabled field if we have prefilledRegisteredModelId */}
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
