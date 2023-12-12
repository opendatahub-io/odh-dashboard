import {
  Button,
  Form,
  FormGroup,
  FormSection,
  Modal,
  ModalVariant,
  Radio,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import * as React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import AWSField from '~/pages/projects/dataConnections/AWSField';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { EdgeModelLocationType, EdgeModelState } from '~/concepts/edge/types';
import {
  assembleEdgeImageRegistrySecret,
  assembleEdgeS3Secret,
  createSecret,
  replaceSecret,
} from '~/api';
import { EDGE_CONSTANT, EMPTY_GIT_SECRET_DATA } from '~/concepts/edge/const';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import GITField from '~/concepts/edge/GITField';
import { createEdgePipelineRun } from '~/concepts/edge/assemblePipelineRuns';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';

type ManageEdgeModelsProps = {
  isOpen: boolean;
  onClose: () => void;
  handleModal: () => void;
  existingModel?: EdgeModelState;
};

const ManageEdgeModels: React.FC<ManageEdgeModelsProps> = ({
  isOpen,
  onClose,
  handleModal,
  existingModel,
}) => {
  const [stateData, setStateData, resetToDefault] = useGenericObjectState<EdgeModelState>({
    name: '',
    modelInferencingEndpoint: '',
    location: EMPTY_AWS_SECRET_DATA,
    locationType: EdgeModelLocationType.S3,
    testDataResource: '',
    outputImageURL: '',
    imageRegistryUsername: '',
    imageRegistryPassword: '',
  });

  React.useEffect(() => {
    if (existingModel) {
      setStateData('modelInferencingEndpoint', existingModel.modelInferencingEndpoint);
      setStateData('location', existingModel.location);
      setStateData('locationType', existingModel.locationType);
      setStateData('testDataResource', existingModel.testDataResource);
      setStateData('outputImageURL', existingModel.outputImageURL);
      setStateData('imageRegistryUsername', existingModel.imageRegistryUsername);
      setStateData('imageRegistryPassword', existingModel.imageRegistryPassword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingModel]);

  const onBeforeClose = () => {
    setStateData('location', EMPTY_AWS_SECRET_DATA);
  };

  const onCreate = () => {
    let s3SecretName = '';
    if (stateData.locationType === EdgeModelLocationType.S3) {
      const locationData = new Map(stateData.location.map((param) => [param.key, param.value]));

      s3SecretName = translateDisplayNameForK8s(`${stateData.name}-credentials-s3`);

      const assembledSecret = assembleEdgeS3Secret(EDGE_CONSTANT, locationData, s3SecretName);

      createSecret(assembledSecret);

      const runPromiseActions = async (dryRun: boolean) => {
        const promiseActions: Promise<K8sResourceCommon>[] = [];
        promiseActions.push(replaceSecret(assembledSecret, { dryRun: dryRun }));
      };

      runPromiseActions(true).then(() => runPromiseActions(false).then(() => onBeforeClose()));
    }
    const imageRegistrySecretName = translateDisplayNameForK8s(
      `${stateData.name}-credentials-quay-image-registry`,
    );

    const assembledImageRegistrySecret = assembleEdgeImageRegistrySecret(
      EDGE_CONSTANT,
      stateData,
      imageRegistrySecretName,
    );
    createSecret(assembledImageRegistrySecret);
    createEdgePipelineRun(stateData, EDGE_CONSTANT, s3SecretName);
    setStateData('location', EMPTY_AWS_SECRET_DATA);
    resetToDefault();
    onClose();
  };

  const onEdit = () => {
    let s3SecretName = '';
    if (stateData.locationType === EdgeModelLocationType.S3) {
      setStateData('location', EMPTY_GIT_SECRET_DATA);
      const locationData = new Map(stateData.location.map((param) => [param.key, param.value]));

      s3SecretName = translateDisplayNameForK8s(`${stateData.name}-credentials-s3`);

      const assembledSecret = assembleEdgeS3Secret(EDGE_CONSTANT, locationData, s3SecretName);

      replaceSecret(assembledSecret);

      const runPromiseActions = async (dryRun: boolean) => {
        const promiseActions: Promise<K8sResourceCommon>[] = [];
        promiseActions.push(replaceSecret(assembledSecret, { dryRun: dryRun }));
      };

      runPromiseActions(true).then(() => runPromiseActions(false).then(() => onBeforeClose()));
    }
    setStateData('location', EMPTY_AWS_SECRET_DATA);
    const imageRegistrySecretName = translateDisplayNameForK8s(
      `${stateData.name}-credentials-quay-image-registry`,
    );

    const assembledImageRegistrySecret = assembleEdgeImageRegistrySecret(
      EDGE_CONSTANT,
      stateData,
      imageRegistrySecretName,
    );
    replaceSecret(assembledImageRegistrySecret);
    createEdgePipelineRun(stateData, EDGE_CONSTANT, s3SecretName);
    resetToDefault();
    onClose();
  };

  const submitAction = !existingModel
    ? [
        <Button
          key="confirm"
          variant="primary"
          onClick={() => {
            onCreate();
          }}
        >
          Add model
        </Button>,
      ]
    : [
        <Button
          key="confirm"
          variant="primary"
          onClick={() => {
            onEdit();
          }}
        >
          Save and rerun build pipeline
        </Button>,
      ];

  return (
    <Modal
      bodyAriaLabel={`${existingModel ? 'Update' : 'Add'} model`}
      tabIndex={0}
      variant={ModalVariant.small}
      title={`${existingModel ? 'Update' : 'Add'} model`}
      isOpen={isOpen}
      onClose={() => onClose()}
      actions={[
        ...submitAction,
        <Button
          key="cancel"
          variant="link"
          onClick={() => {
            resetToDefault();
            handleModal();
          }}
        >
          Cancel
        </Button>,
      ]}
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
                  setStateData('location', EMPTY_AWS_SECRET_DATA);
                }}
                id="model-registry-s3-bucket-radio"
                name="s3-bucket-radio"
                body={
                  stateData.locationType === EdgeModelLocationType.S3 && (
                    <AWSField
                      values={stateData.location}
                      onUpdate={(data) => setStateData('location', data)}
                    />
                  )
                }
              />
              <Radio
                label="Git repository"
                isChecked={stateData.locationType === EdgeModelLocationType.GIT}
                onChange={() => {
                  setStateData('locationType', EdgeModelLocationType.GIT);
                  setStateData('location', EMPTY_GIT_SECRET_DATA);
                }}
                id="model-registry-git-respository-radio"
                name="git-repository-radio"
                body={
                  stateData.locationType === EdgeModelLocationType.GIT && (
                    <GITField
                      values={stateData.location}
                      onUpdate={(data) => setStateData('location', data)}
                    />
                  )
                }
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <Stack>
              <FormSection title="Output image resources">
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
                    label="Output model container image file URL"
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
                <StackItem>
                  <FormGroup
                    label="Image registry username"
                    fieldId="Image-registry-username"
                    isRequired
                  >
                    <TextInput
                      isRequired
                      id="image-registry-username"
                      value={stateData.imageRegistryUsername}
                      onChange={(_event, value) => setStateData('imageRegistryUsername', value)}
                    />
                  </FormGroup>
                </StackItem>
                <StackItem>
                  <FormGroup
                    label="Image registry password"
                    fieldId="Image-registry-password"
                    isRequired
                  >
                    <TextInput
                      isRequired
                      id="image-registry-password"
                      type={'password'}
                      value={stateData.imageRegistryPassword}
                      onChange={(_event, value) => setStateData('imageRegistryPassword', value)}
                    />
                  </FormGroup>
                </StackItem>
              </FormSection>
            </Stack>
          </StackItem>
        </Stack>
      </Form>
    </Modal>
  );
};

export default ManageEdgeModels;
