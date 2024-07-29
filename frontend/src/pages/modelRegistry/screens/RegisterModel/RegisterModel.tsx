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
  FormSection,
  HelperText,
  HelperTextItem,
  InputGroupItem,
  InputGroupText,
  Radio,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Text,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useRegisterModelData from './useRegisterModelData';

const RegisterModel: React.FC = () => {
  const { modelRegistry: mrName } = useParams();
  const [
    {
      modelRegistryName,
      modelName,
      modelDescription,
      versionName,
      versionDescription,
      sourceModelFormat,
      modelLocationType,
      modelLocationEndpoint,
      modelLocationBucket,
      modelLocationRegion,
      modelLocationPath,
      modelLocationURI,
    },
    setData,
    resetData,
  ] = useRegisterModelData(mrName);
  const [loading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  enum ModelLocationType {
    ObjectStorage = 'Object storage',
    URI = 'URI',
  }

  const isSubmitDisabled =
    !modelRegistryName ||
    !modelName ||
    !versionName ||
    loading ||
    (modelLocationType === ModelLocationType.URI && !modelLocationURI) ||
    (modelLocationType === ModelLocationType.ObjectStorage &&
      (!modelLocationBucket || !modelLocationEndpoint || !modelLocationPath));

  const handleSubmit = () => {
    setIsLoading(true);
    setError(undefined);
    //TODO: implement submit calls/logic. remove console log and alert
    alert('This functionality is not yet implemented');
    /* eslint-disable-next-line no-console */
    console.log({
      modelRegistryName,
      modelName,
      modelDescription,
      versionName,
      versionDescription,
      sourceModelFormat,
      modelLocationType,
      modelLocationEndpoint,
      modelLocationBucket,
      modelLocationRegion,
      modelLocationPath,
      modelLocationURI,
    });
  };

  return (
    <ApplicationsPage
      title="Register model"
      description="Create a new model and register a first version of the new model."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/modelRegistry">Model registry</Link>} />
          <BreadcrumbItem
            render={() => (
              <Link to={`/modelRegistry/${modelRegistryName}`}>{modelRegistryName}</Link>
            )}
          />
          <BreadcrumbItem>Register model</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            <FormGroup label="Model registry" isRequired fieldId="mr-name">
              <TextInput
                isDisabled
                isRequired
                type="text"
                id="mr-name"
                name="mr-name"
                value={modelRegistryName}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormSection
              title={
                <>
                  <Title headingLevel="h2">Model info</Title>
                  <Text component="p" className="form-subtitle-text">
                    Configure the model info you want to create.
                  </Text>
                </>
              }
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
              title={
                <>
                  <Title headingLevel="h2">Version info</Title>
                  <Text component="p" className="form-subtitle-text">
                    Configure the version info for the run that you want to register.
                  </Text>
                </>
              }
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
            </FormSection>
            <FormSection
              title={
                <>
                  <Title headingLevel="h2">Model location</Title>
                  <Text component="p" className="form-subtitle-text">
                    Specify the model location by providing either the object storage details or the
                    URI.
                  </Text>
                </>
              }
            >
              <Radio
                isChecked={modelLocationType === ModelLocationType.ObjectStorage}
                name="location-type-object-storage"
                onChange={() => {
                  setData('modelLocationType', ModelLocationType.ObjectStorage);
                }}
                label="Object storage"
                id="location-type-object-storage"
              />
              {modelLocationType === ModelLocationType.ObjectStorage && (
                <>
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
                        Enter a path to a model or folder. This path cannot point to a root folder.
                      </HelperTextItem>
                    </HelperText>
                  </FormGroup>
                </>
              )}
              <Radio
                isChecked={modelLocationType === ModelLocationType.URI}
                name="location-type-uri"
                onChange={() => {
                  setData('modelLocationType', ModelLocationType.URI);
                }}
                label="URI"
                id="location-type-uri"
              />
              {modelLocationType === ModelLocationType.URI && (
                <>
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
                </>
              )}
            </FormSection>
          </StackItem>
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
                onClick={() => resetData()}
              >
                Cancel
              </Button>
            </ActionGroup>
          </StackItem>
        </Stack>
      </Form>
    </ApplicationsPage>
  );
};

export default RegisterModel;
