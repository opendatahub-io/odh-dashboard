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
import { OptimizeIcon } from '@patternfly/react-icons';
import FormSection from '~/components/pf-overrides/FormSection';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { useAppSelector } from '~/redux/hooks';
import { DataConnection } from '~/pages/projects/types';
import { convertAWSSecretData } from '~/pages/projects/screens/detail/data-connections/utils';
import {
  useRegisterModelData,
  ModelLocationType,
  RegisterVersionFormData,
} from './useRegisterModelData';
import { registerModel } from './utils';
import { ConnectionModal } from './ConnectionModal';

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
  const [formError, setFormError] = React.useState<Error | undefined>(undefined);
  const [isAutofillModalOpen, setAutofillModalOpen] = React.useState(false);

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
    setFormError(undefined);

    registerModel(apiState, formData, author)
      .then(({ registeredModel }) => {
        navigate(`/modelRegistry/${mrName}/registeredModels/${registeredModel.id}`);
      })
      .catch((e: Error) => {
        setIsLoading(false);
        setFormError(e);
      });
  };

  const connectionDataMap: Record<string, keyof RegisterVersionFormData> = {
    AWS_S3_ENDPOINT: 'modelLocationEndpoint',
    AWS_S3_BUCKET: 'modelLocationBucket',
    AWS_DEFAULT_REGION: 'modelLocationRegion',
  };

  const fillObjectStorageByConnection = (connection: DataConnection) => {
    convertAWSSecretData(connection).forEach((dataItem) => {
      setData(connectionDataMap[dataItem.key], dataItem.value);
    });
  };

  return (
    <ApplicationsPage
      title="Register model"
      description="Create a new model and register the first version of your new model."
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
                <Split>
                  <SplitItem isFilled>
                    <Radio
                      isChecked={modelLocationType === ModelLocationType.ObjectStorage}
                      name="location-type-object-storage"
                      onChange={() => {
                        setData('modelLocationType', ModelLocationType.ObjectStorage);
                      }}
                      label="Object storage"
                      id="location-type-object-storage"
                    />
                  </SplitItem>
                  {modelLocationType === ModelLocationType.ObjectStorage && (
                    <SplitItem>
                      <Button
                        data-testid="object-storage-autofill-button"
                        variant="link"
                        isInline
                        icon={<OptimizeIcon />}
                        onClick={() => setAutofillModalOpen(true)}
                      >
                        Autofill from data connection
                      </Button>
                    </SplitItem>
                  )}
                </Split>
                {modelLocationType === ModelLocationType.ObjectStorage && (
                  <>
                    <FormGroup
                      className={spacing.mlLg}
                      label="Endpoint"
                      isRequired
                      fieldId="location-endpoint"
                    >
                      <TextInput
                        isRequired
                        type="text"
                        id="location-endpoint"
                        name="location-endpoint"
                        value={modelLocationEndpoint}
                        onChange={(_e, value) => setData('modelLocationEndpoint', value)}
                      />
                    </FormGroup>
                    <FormGroup
                      className={spacing.mlLg}
                      label="Bucket"
                      isRequired
                      fieldId="location-bucket"
                    >
                      <TextInput
                        isRequired
                        type="text"
                        id="location-bucket"
                        name="location-bucket"
                        value={modelLocationBucket}
                        onChange={(_e, value) => setData('modelLocationBucket', value)}
                      />
                    </FormGroup>
                    <FormGroup className={spacing.mlLg} label="Region" fieldId="location-region">
                      <TextInput
                        type="text"
                        id="location-region"
                        name="location-region"
                        value={modelLocationRegion}
                        onChange={(_e, value) => setData('modelLocationRegion', value)}
                      />
                    </FormGroup>
                    <FormGroup
                      className={spacing.mlLg}
                      label="Path"
                      isRequired
                      fieldId="location-path"
                    >
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
          {formError && (
            <StackItem>
              <Alert
                isInline
                variant="danger"
                title={formError.name}
                actionClose={<AlertActionCloseButton onClose={() => setFormError(undefined)} />}
              >
                {formError.message}
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
      <ConnectionModal
        isOpen={isAutofillModalOpen}
        onClose={() => setAutofillModalOpen(false)}
        onSubmit={(connection) => {
          fillObjectStorageByConnection(connection);
          setAutofillModalOpen(false);
        }}
      />
    </ApplicationsPage>
  );
};

export default RegisterModel;
