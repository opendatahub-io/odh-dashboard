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
import { useCreateServingRuntimeObject } from '../utils';
import { ProjectDetailsContext } from '../../../../projects/ProjectDetailsContext';
import {
  addSupportModelMeshProject,
  assembleSecretSA,
  createRoleBinding,
  createSecret,
  deleteSecret,
  generateRoleBindingServingRuntime,
  replaceSecret,
} from '../../../../../api';
import {
  createServingRuntime,
  updateServingRuntime,
} from '../../../../../api/network/servingRuntimes';
import { ServingRuntimeKind, SecretKind, K8sStatus } from '../../../../../k8sTypes';
import {
  assembleServingRuntimeSA,
  createServiceAccount,
} from '../../../../../api/network/serviceAccounts';
import { allSettledPromises } from '../../../../../utilities/allSettledPromises';
import ModelServerReplicaSection from './ServingRuntimeReplicaSection';
import ModelServerSizeSection from './ServingRuntimeSizeSection';
import ModelServerTokenSection from './ServingRuntimeTokenSection';
import { translateDisplayNameForK8s } from 'pages/projects/utils';

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
  const [createData, setCreateData, resetData, sizes] = useCreateServingRuntimeObject(editInfo);

  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  const tokenErrors = createData.tokens.filter((token) => token.error !== '').length > 0;

  const canCreate = !actionInProgress && !tokenErrors;

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setActionInProgress(false);
    resetData();
  };

  const setErrorModal = (error: Error) => {
    setError(error);
    setActionInProgress(false);
  };

  const enableTokenAuth = async (): Promise<void> => {
    if (!createData.tokenAuth) {
      return Promise.resolve();
    }

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
              .then(() => {
                return Promise.resolve();
              })
              .catch((error) => {
                return Promise.reject(error);
              });
          })
          .catch((error) => {
            return Promise.reject(error);
          });
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  };

  const updateSecrets = async (): Promise<void> => {
    const deletedSecrets = (editInfo?.secrets || [])
      .map((secret) => secret.metadata.name)
      .filter((token) => !createData.tokens.some((tokenEdit) => tokenEdit.editName === token));
    allSettledPromises<K8sStatus | SecretKind, Error>([
      ...createData.tokens
        .filter((token) => translateDisplayNameForK8s(token.name) !== token.editName)
        .map((token) => {
          const secretToken = assembleSecretSA(token.name, namespace, token.editName);
          if (token.editName) {
            return replaceSecret(secretToken);
          } else {
            return createSecret(secretToken);
          }
        }),
      ...deletedSecrets.map((secret) => {
        return deleteSecret(namespace, secret);
      }),
    ])
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        return Promise.reject(error);
      });
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
      allSettledPromises<ServingRuntimeKind | string | void, Error>([
        ...(currentProject.metadata.labels?.['modelmesh-enabled']
          ? [addSupportModelMeshProject(currentProject.metadata.name)]
          : []),
        createServingRuntime(createData, namespace),
        enableTokenAuth(),
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
        <Button key="submit-model" variant="primary" isDisabled={!canCreate} onClick={submit}>
          Configure
        </Button>,
        <Button key="cancel-model" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Stack hasGutter>
          <StackItem>
            <ModelServerReplicaSection data={createData} setData={setCreateData} />
          </StackItem>
          <StackItem>
            <ModelServerSizeSection data={createData} setData={setCreateData} sizes={sizes} />
          </StackItem>
          <StackItem>
            <FormSection title="Model route" titleElement="div">
              <FormGroup>
                <Checkbox
                  label="Make deployed available via an external route"
                  id="alt-form-checkbox-route"
                  name="alt-form-checkbox-route"
                  isChecked={createData.externalRoute}
                  onChange={(check) => setCreateData('externalRoute', check)}
                />
              </FormGroup>
            </FormSection>
          </StackItem>
          <StackItem>
            <ModelServerTokenSection data={createData} setData={setCreateData} />
          </StackItem>
        </Stack>
      </Form>
      {error && (
        <Alert isInline variant="danger" title="Error creating model server">
          {error.message}
        </Alert>
      )}
    </Modal>
  );
};

export default ManageServingRuntimeModal;
