import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormSection,
  Modal,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useCreateServingRuntimeObject } from '~/pages/modelServing/screens/projects/utils';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import {
  addSupportModelMeshProject,
  assembleSecretSA,
  createRoleBinding,
  createSecret,
  deleteSecret,
  generateRoleBindingServingRuntime,
  replaceSecret,
} from '~/api';
import {
  createServingRuntime,
  updateServingRuntime,
  assembleServingRuntimeSA,
  createServiceAccount,
} from '~/api';
import { ServingRuntimeKind, SecretKind, K8sStatus } from '~/k8sTypes';
import { allSettledPromises } from '~/utilities/allSettledPromises';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { requestsUnderLimits, resourcesArePositive } from '~/pages/modelServing/utils';
import ServingRuntimeReplicaSection from './ServingRuntimeReplicaSection';
import ServingRuntimeSizeSection from './ServingRuntimeSizeSection';
import ServingRuntimeTokenSection from './ServingRuntimeTokenSection';

type ManageServingRuntimeModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
  editInfo?: {
    servingRuntime?: ServingRuntimeKind;
    secrets: SecretKind[];
  };
};

const ManageServingRuntimeModal: React.FC<ManageServingRuntimeModalProps> = ({
  isOpen,
  onClose,
  editInfo,
}) => {
  const [createData, setCreateData, resetData, sizes, gpuSetting] =
    useCreateServingRuntimeObject(editInfo);

  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const {
    currentProject,
    servingRuntimesConfig: {
      servingRuntimesConfig,
      refresh: servingRuntimeConfigRefresh,
      loaded: servingRuntimeConfigLoaded,
    },
  } = React.useContext(ProjectDetailsContext);

  const namespace = currentProject.metadata.name;

  const tokenErrors = createData.tokens.filter((token) => token.error !== '').length > 0;

  const inputValueValid =
    servingRuntimeConfigLoaded &&
    createData.numReplicas >= 0 &&
    resourcesArePositive(createData.modelSize.resources) &&
    requestsUnderLimits(createData.modelSize.resources);

  const canCreate = !actionInProgress && !tokenErrors && inputValueValid;

  React.useEffect(() => {
    if (isOpen) {
      servingRuntimeConfigRefresh();
    }
  }, [isOpen, servingRuntimeConfigRefresh]);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setError(undefined);
    setActionInProgress(false);
    resetData();
  };

  const setErrorModal = (error: Error) => {
    setError(error);
    setActionInProgress(false);
  };

  const setupTokenAuth = async (): Promise<void> => {
    const modelMeshSA = assembleServingRuntimeSA(namespace);
    createServiceAccount(modelMeshSA)
      .then(() => {
        const tokenAuth = generateRoleBindingServingRuntime(namespace);
        createRoleBinding(tokenAuth)
          .then(() => {
            allSettledPromises<SecretKind, Error>(
              createData.tokens.map((token) => {
                const secretToken = assembleSecretSA(token.name, namespace);
                return createSecret(secretToken);
              }),
            )
              .then(() => Promise.resolve())
              .catch((error) => Promise.reject(error));
          })
          .catch((error) => Promise.reject(error));
      })
      .catch((error) => Promise.reject(error));
  };

  const updateSecrets = async (): Promise<void> => {
    const deletedSecrets = (editInfo?.secrets || [])
      .map((secret) => secret.metadata.name)
      .filter((token) => !createData.tokens.some((tokenEdit) => tokenEdit.editName === token));
    Promise.all<K8sStatus | SecretKind>([
      ...createData.tokens
        .filter((token) => translateDisplayNameForK8s(token.name) !== token.editName)
        .map((token) => {
          const secretToken = assembleSecretSA(token.name, namespace, token.editName);
          if (token.editName) {
            return replaceSecret(secretToken);
          }
          return createSecret(secretToken);
        }),
      ...deletedSecrets.map((secret) => deleteSecret(namespace, secret)),
    ])
      .then(() => Promise.resolve())
      .catch((error) => Promise.reject(error));
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    if (editInfo) {
      // TODO: Delete secrets
      updateSecrets()
        .then(() => {
          if (!editInfo?.servingRuntime) {
            return;
          }
          updateServingRuntime(createData, editInfo.servingRuntime)
            .then(() => {
              setActionInProgress(false);
              onBeforeClose(true);
            })
            .catch((e) => setErrorModal(e));
        })
        .catch((e) => setErrorModal(e));
    } else {
      Promise.all<ServingRuntimeKind | string | void>([
        ...(currentProject.metadata.labels?.['modelmesh-enabled']
          ? [addSupportModelMeshProject(currentProject.metadata.name)]
          : []),
        createServingRuntime(createData, servingRuntimesConfig, namespace),
        setupTokenAuth(),
      ])
        .then(() => {
          setActionInProgress(false);
          onBeforeClose(true);
        })
        .catch((e) => setErrorModal(e));
    }
  };

  return (
    <Modal
      title="Configure model server"
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button
          key="submit-model"
          variant="primary"
          isDisabled={!canCreate}
          onClick={submit}
          isLoading={actionInProgress}
        >
          Configure
        </Button>,
        <Button key="cancel-model" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Stack hasGutter>
              <StackItem>
                <ServingRuntimeReplicaSection data={createData} setData={setCreateData} />
              </StackItem>
              <StackItem>
                <ServingRuntimeSizeSection
                  data={createData}
                  setData={setCreateData}
                  sizes={sizes}
                  gpuSetting={gpuSetting}
                />
              </StackItem>
              <StackItem>
                <FormSection title="Model route" titleElement="div">
                  <FormGroup>
                    <Checkbox
                      label="Make deployed models available through an external route"
                      id="alt-form-checkbox-route"
                      name="alt-form-checkbox-route"
                      isChecked={createData.externalRoute}
                      onChange={(check) => setCreateData('externalRoute', check)}
                    />
                  </FormGroup>
                </FormSection>
              </StackItem>
              <StackItem>
                <ServingRuntimeTokenSection data={createData} setData={setCreateData} />
              </StackItem>
            </Stack>
          </Form>
        </StackItem>

        {error && (
          <StackItem>
            <Alert isInline variant="danger" title="Error creating model server">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default ManageServingRuntimeModal;
