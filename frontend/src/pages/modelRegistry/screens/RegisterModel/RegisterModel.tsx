import React from 'react';
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  InputGroupItem,
  InputGroupText,
  PageSection,
  Radio,
  Split,
  SplitItem,
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
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { useAppSelector } from '~/redux/hooks';
import { useRegisterModelData, ModelLocationType } from './useRegisterModelData';
import { registerModel } from './utils';

const RegisterModel: React.FC = () => {
  const { modelRegistry: mrName } = useParams();
  const navigate = useNavigate();
  const [formData, setData] = useRegisterModelData();
  const {
    modelName,
    modelDescription,
    versionName,
    versionDescription,
    sourceModelFormat,
    sourceModelFormatVersion,
    modelLocationType,
    modelLocationEndpoint,
    modelLocationBucket,
    modelLocationRegion,
    modelLocationPath,
    modelLocationURI,
  } = formData;
  const [loading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const { apiState } = React.useContext(ModelRegistryContext);
  const author = useAppSelector((state) => state.user || '');

  const isSubmitDisabled =
    !modelName ||
    !versionName ||
    loading ||
    (modelLocationType === ModelLocationType.URI && !modelLocationURI) ||
    (modelLocationType === ModelLocationType.ObjectStorage &&
      (!modelLocationBucket || !modelLocationEndpoint || !modelLocationPath));

  const handleSubmit = () => {
    setIsLoading(true);
    setError(undefined);

    registerModel(apiState, formData, author)
      .then(({ registeredModel }) => {
        navigate(`/modelRegistry/${mrName}/registeredModels/${registeredModel.id}`);
      })
      .catch((e: Error) => {
        setIsLoading(false);
        setError(e);
      });
  };

  return (
    <ApplicationsPage
      title="Register model"
      description="Create a new model and register a first version of the new model."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={`/modelRegistry/${mrName}`}>Model registry - {mrName}</Link>}
          />
          <BreadcrumbItem>Register model</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection variant="light" isFilled>
        <Form isWidthLimited>
          <Stack hasGutter>
            <StackItem>
              <FormGroup
                label="Model registry"
                isRequired
                fieldId="mr-name"
                className={spacing.mbLg}
              >
                <TextInput
                  isDisabled
                  isRequired
                  type="text"
                  id="mr-name"
                  name="mr-name"
                  value={mrName}
                />
              </FormGroup>
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
                  />
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
              <FormSection
                title="Version details"
                description="Configure details for the first version of this model."
              >
                <FormGroup label="Version name" isRequired fieldId="version-name">
                  <TextInput
                    isRequired
                    type="text"
                    id="version-name"
                    name="version-name"
                    value={versionName}
                    onChange={(_e, value) => setData('versionName', value)}
                  />
                </FormGroup>
                <FormGroup label="Version description" fieldId="version-description">
                  <TextArea
                    type="text"
                    id="version-description"
                    name="version-description"
                    value={versionDescription}
                    onChange={(_e, value) => setData('versionDescription', value)}
                  />
                </FormGroup>
                <FormGroup label="Source model format" fieldId="source-model-format">
                  <TextInput
                    type="text"
                    placeholder="Example, tensorflow"
                    id="source-model-format"
                    name="source-model-format"
                    value={sourceModelFormat}
                    onChange={(_e, value) => setData('sourceModelFormat', value)}
                  />
                </FormGroup>
                <FormGroup
                  label="Source model format version"
                  fieldId="source-model-format-version"
                >
                  <TextInput
                    type="text"
                    placeholder="Example, 1"
                    id="source-model-format-version"
                    name="source-model-format-version"
                    value={sourceModelFormatVersion}
                    onChange={(_e, value) => setData('sourceModelFormatVersion', value)}
                  />
                </FormGroup>
              </FormSection>
              <FormSection
                title="Model location"
                description="Specify the model location by providing either the object storage details or the URI."
              >
                <Radio
                  isChecked={modelLocationType === ModelLocationType.ObjectStorage}
                  name="location-type-object-storage"
                  onChange={() => {
                    setData('modelLocationType', ModelLocationType.ObjectStorage);
                  }}
                  label="Object storage"
                  id="location-type-object-storage"
                  body={
                    modelLocationType === ModelLocationType.ObjectStorage && (
                      <Form>
                        <FormGroup label="Endpoint" isRequired fieldId="location-endpoint">
                          <TextInput
                            isRequired
                            type="text"
                            id="location-endpoint"
                            name="location-endpoint"
                            value={modelLocationEndpoint}
                            onChange={(_e, value) => setData('modelLocationEndpoint', value)}
                          />
                        </FormGroup>
                        <FormGroup label="Bucket" isRequired fieldId="location-bucket">
                          <TextInput
                            isRequired
                            type="text"
                            id="location-bucket"
                            name="location-bucket"
                            value={modelLocationBucket}
                            onChange={(_e, value) => setData('modelLocationBucket', value)}
                          />
                        </FormGroup>
                        <FormGroup label="Region" fieldId="location-region">
                          <TextInput
                            type="text"
                            id="location-region"
                            name="location-region"
                            value={modelLocationRegion}
                            onChange={(_e, value) => setData('modelLocationRegion', value)}
                          />
                        </FormGroup>
                        <FormGroup label="Path" isRequired fieldId="location-path">
                          <Split hasGutter>
                            <SplitItem>
                              <InputGroupText isPlain>/</InputGroupText>
                            </SplitItem>
                            <SplitItem isFilled>
                              <InputGroupItem>
                                <TextInput
                                  isRequired
                                  type="text"
                                  id="location-path"
                                  name="location-path"
                                  value={modelLocationPath}
                                  onChange={(_e, value) => setData('modelLocationPath', value)}
                                />
                              </InputGroupItem>
                            </SplitItem>
                          </Split>
                          <HelperText>
                            <HelperTextItem>
                              Enter a path to a model or folder. This path cannot point to a root
                              folder.
                            </HelperTextItem>
                          </HelperText>
                        </FormGroup>
                      </Form>
                    )
                  }
                />
                <Radio
                  isChecked={modelLocationType === ModelLocationType.URI}
                  name="location-type-uri"
                  onChange={() => {
                    setData('modelLocationType', ModelLocationType.URI);
                  }}
                  label="URI"
                  id="location-type-uri"
                  body={
                    modelLocationType === ModelLocationType.URI && (
                      <Form>
                        <FormGroup label="URI" isRequired fieldId="location-uri">
                          <TextInput
                            isRequired
                            type="text"
                            id="location-uri"
                            name="location-uri"
                            value={modelLocationURI}
                            onChange={(_e, value) => setData('modelLocationURI', value)}
                          />
                        </FormGroup>
                      </Form>
                    )
                  }
                />
              </FormSection>
            </StackItem>
          </Stack>
        </Form>
      </PageSection>
      <PageSection stickyOnBreakpoint={{ default: 'bottom' }} variant="light">
        <Stack hasGutter>
          {error && (
            <StackItem>
              <Alert
                isInline
                variant="danger"
                title={error.name}
                actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
          <StackItem>
            <ActionGroup>
              <Button
                isDisabled={isSubmitDisabled}
                variant="primary"
                id="create-button"
                data-testid="create-button"
                isLoading={loading}
                onClick={() => handleSubmit()}
              >
                Register model
              </Button>
              <Button
                isDisabled={loading}
                variant="link"
                id="cancel-button"
                onClick={() => navigate(`/modelRegistry/${mrName}`)}
              >
                Cancel
              </Button>
            </ActionGroup>
          </StackItem>
        </Stack>
      </PageSection>
    </ApplicationsPage>
  );
};

export default RegisterModel;
