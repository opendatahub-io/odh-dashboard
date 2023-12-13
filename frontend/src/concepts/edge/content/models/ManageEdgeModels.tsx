import {
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Radio,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import {
  EdgeModel,
  EdgeModelLocationType,
  EdgeModelPipelineKnownWorkspaces,
  EdgeModelState,
} from '~/concepts/edge/types';
import { createSecret, deleteSecret, replaceSecret } from '~/api';
import { EDGE_CONSTANT } from '~/concepts/edge/const';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { K8sStatus } from '~/k8sTypes';
import { isTestDataWorkspace } from '~/concepts/edge/utils';
import useEdgeS3Secret from '~/concepts/edge/hooks/useEdgeS3Secret';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { assembleEdgeS3Secret, createEdgePipelineRun, isEdgeS3Valid } from './utils';
import EdgeS3Field from './EdgeS3Field';
import { EMPTY_EDGE_S3_SECRET_DATA } from './const';

type ManageEdgeModelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  existingModel?: EdgeModel;
};

const ManageEdgeModelModal: React.FC<ManageEdgeModelModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingModel,
}) => {
  const [stateData, setStateData, resetToDefault] = useGenericObjectState<EdgeModelState>({
    name: '',
    modelInferencingEndpoint: '',
    s3Location: EMPTY_EDGE_S3_SECRET_DATA,
    locationType: EdgeModelLocationType.S3,
    testDataResource: '',
    outputImageURL: '',
    modelRelativePath: '',
    s3BucketName: '',
  });

  const [error, setError] = React.useState<Error | undefined>(undefined);

  const [s3Secret] = useEdgeS3Secret(EDGE_CONSTANT, existingModel?.s3SecretName ?? '');

  React.useEffect(() => {
    if (s3Secret) {
      setStateData('s3Location', s3Secret);
    }
  }, [s3Secret, setStateData]);

  React.useEffect(() => {
    if (existingModel) {
      // get test data resource name
      const testDataWorkspace = existingModel.latestRun.run.spec.workspaces.find(
        (w) => w.name === EdgeModelPipelineKnownWorkspaces.TEST_DATA,
      );

      setStateData('modelInferencingEndpoint', existingModel.params.testEndpoint);
      setStateData(
        'locationType',
        existingModel?.s3SecretName ? EdgeModelLocationType.S3 : EdgeModelLocationType.GIT,
      );
      setStateData(
        'testDataResource',
        testDataWorkspace && isTestDataWorkspace(testDataWorkspace)
          ? testDataWorkspace.configMap.name
          : '',
      );
      setStateData('outputImageURL', existingModel.params.targetImageRepo);
      setStateData('name', existingModel.params.modelName);
      setStateData('version', existingModel.params.modelVersion);
      setStateData('modelRelativePath', existingModel.params.modelRelativePath);
      setStateData('s3BucketName', existingModel.params.s3BucketName);
      setStateData('gitModelRepo', existingModel.params.gitModelRepo);
      setStateData('gitRevision', existingModel.params.gitRevision);
    }
  }, [existingModel, setStateData]);

  const [isLoading, setIsLoading] = React.useState(false);

  const canSubmit = () =>
    stateData.name !== '' &&
    stateData.modelInferencingEndpoint !== '' &&
    stateData.testDataResource !== '' &&
    stateData.outputImageURL !== '' &&
    ((stateData.locationType === EdgeModelLocationType.GIT &&
      stateData.gitModelRepo !== '' &&
      stateData.gitRevision !== '') ||
      (stateData.locationType === EdgeModelLocationType.S3 &&
        stateData.s3BucketName &&
        isEdgeS3Valid(stateData.s3Location)));

  const onBeforeClose = () => {
    resetToDefault();
    setError(undefined);
    setIsLoading(false);
  };

  const handleSubmit = () => {
    const runPromiseActions = async (dryRun: boolean) => {
      const promiseActions: Promise<K8sResourceCommon | K8sStatus>[] = [];

      // check if switching from s3 to git, so delete
      if (
        stateData.locationType === EdgeModelLocationType.GIT &&
        existingModel?.s3SecretName === EdgeModelLocationType.S3
      ) {
        const name = translateDisplayNameForK8s(`${stateData.name}-credentials-s3`);
        promiseActions.push(deleteSecret(EDGE_CONSTANT, name, { dryRun }));
      }

      // if s3
      let s3SecretName;
      if (stateData.locationType === EdgeModelLocationType.S3) {
        const assembledSecret = assembleEdgeS3Secret(
          stateData.s3Location,
          stateData.name,
          EDGE_CONSTANT,
        );
        s3SecretName = assembledSecret.metadata.name;

        if (existingModel) {
          promiseActions.push(replaceSecret(assembledSecret, { dryRun: dryRun }));
        } else {
          promiseActions.push(createSecret(assembledSecret, { dryRun: dryRun }));
        }
      }

      promiseActions.push(createEdgePipelineRun(stateData, EDGE_CONSTANT, s3SecretName, dryRun));

      return Promise.all(promiseActions);
    };

    setIsLoading(true);
    runPromiseActions(true)
      .then(() => {
        runPromiseActions(false)
          .then(() => {
            onAdd();
            onBeforeClose();
            onClose();
          })
          .catch((e) => {
            setError(e);
          })
          .finally(() => {
            setIsLoading(false);
          });
      })
      .catch((e) => {
        setIsLoading(false);
        setError(e);
      });
  };

  return (
    <Modal
      bodyAriaLabel={`${existingModel ? 'Update' : 'Add'} model`}
      tabIndex={0}
      variant={ModalVariant.medium}
      title={`${existingModel ? 'Update' : 'Add'} model`}
      isOpen={isOpen}
      onClose={() => {
        onBeforeClose();
        onClose();
      }}
      footer={
        <DashboardModalFooter
          submitLabel={existingModel ? 'Save and rerun build pipeline' : 'Add model'}
          onSubmit={() => handleSubmit()}
          isLoading={isLoading}
          onCancel={() => {
            onBeforeClose();
            onClose();
          }}
          isSubmitDisabled={!canSubmit()}
          error={error}
          alertTitle="Error creating model"
        />
      }
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            <FormGroup label="Model Name" fieldId="add-model-name-input" isRequired>
              <TextInput
                isRequired
                id="model-name-input"
                value={stateData.name}
                onChange={(_event, value) => setStateData('name', value)}
                isDisabled={!!existingModel}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup
              label="Model inferencing endpoint"
              fieldId="model-inferencing-endpoint-input"
              isRequired
            >
              <TextInput
                isRequired
                id="model-inferencing-endpoint-input"
                value={stateData.modelInferencingEndpoint}
                onChange={(_event, value) => setStateData('modelInferencingEndpoint', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup
              role="group"
              isInline
              fieldId="model-location"
              label="Model location"
              isStack={true}
            >
              <Radio
                label="S3 bucket"
                isChecked={stateData.locationType === EdgeModelLocationType.S3}
                onChange={() => {
                  setStateData('locationType', EdgeModelLocationType.S3);
                  setStateData('s3Location', s3Secret ?? EMPTY_EDGE_S3_SECRET_DATA);
                  setStateData('gitModelRepo', '');
                  setStateData('gitRevision', 'main');
                }}
                id="model-registry-s3-bucket-radio"
                name="s3-bucket-radio"
                body={
                  stateData.locationType === EdgeModelLocationType.S3 && (
                    <Stack hasGutter>
                      <StackItem>
                        <EdgeS3Field
                          values={stateData.s3Location}
                          onUpdate={(data) => setStateData('s3Location', data)}
                        />
                      </StackItem>
                      <StackItem>
                        <FormGroup label="Bucket" fieldId="bucket" isRequired>
                          <TextInput
                            isRequired
                            id="bucket"
                            value={stateData.s3BucketName}
                            onChange={(_event, value) => setStateData('s3BucketName', value)}
                          />
                        </FormGroup>
                      </StackItem>
                    </Stack>
                  )
                }
              />
              <Radio
                label="Git repository"
                isChecked={stateData.locationType === EdgeModelLocationType.GIT}
                onChange={() => {
                  setStateData('locationType', EdgeModelLocationType.GIT);
                  setStateData('s3Location', s3Secret ?? EMPTY_EDGE_S3_SECRET_DATA);
                  setStateData('gitModelRepo', '');
                  setStateData('gitRevision', 'main');
                }}
                id="model-registry-git-respository-radio"
                name="git-repository-radio"
                body={
                  stateData.locationType === EdgeModelLocationType.GIT && (
                    <Stack hasGutter>
                      <StackItem>
                        <FormGroup
                          label="Git repository URL"
                          fieldId="git-repository-url"
                          isRequired
                        >
                          <TextInput
                            isRequired
                            id="git-repository-url"
                            value={stateData.gitModelRepo}
                            onChange={(_event, value) => setStateData('gitModelRepo', value)}
                          />
                        </FormGroup>
                      </StackItem>
                      <StackItem>
                        <FormGroup label="Branch" fieldId="git-branch" isRequired>
                          <TextInput
                            isRequired
                            id="git-branch"
                            value={stateData.gitRevision}
                            onChange={(_event, value) => setStateData('gitRevision', value)}
                          />
                        </FormGroup>
                      </StackItem>
                    </Stack>
                  )
                }
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Model relative path" fieldId="model-path">
              <TextInput
                id="model-path-text"
                value={stateData.modelRelativePath}
                onChange={(_event, value) => setStateData('modelRelativePath', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Test data resource" fieldId="test-data-resource" isRequired>
              <TextInput
                isRequired
                id="test-data-resource"
                value={stateData.testDataResource}
                onChange={(_event, value) => setStateData('testDataResource', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup
              label="Output image registry name"
              fieldId="Output-model-image-file-URL"
              isRequired
            >
              <TextInput
                isRequired
                id="output-model-image-url"
                value={stateData.outputImageURL}
                onChange={(_event, value) => setStateData('outputImageURL', value)}
              />
            </FormGroup>
          </StackItem>
        </Stack>
      </Form>
    </Modal>
  );
};

export default ManageEdgeModelModal;
