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
import { ServingRuntimeKind, SecretKind, TemplateKind, ProjectKind } from '~/k8sTypes';
import { addSupportModelMeshProject, createServingRuntime, updateServingRuntime } from '~/api';
import {
  requestsUnderLimits,
  resourcesArePositive,
  setUpTokenAuth,
  updateSecrets,
} from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import {
  getServingRuntimeFromTemplate,
  getServingRuntimeNameFromTemplate,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import ServingRuntimeReplicaSection from './ServingRuntimeReplicaSection';
import ServingRuntimeSizeSection from './ServingRuntimeSizeSection';
import ServingRuntimeTokenSection from './ServingRuntimeTokenSection';
import ServingRuntimeTemplateSection from './ServingRuntimeTemplateSection';

type ManageServingRuntimeModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
  currentProject: ProjectKind;
  servingRuntimeTemplates?: TemplateKind[];
  editInfo?: {
    servingRuntime?: ServingRuntimeKind;
    secrets: SecretKind[];
  };
};

const ManageServingRuntimeModal: React.FC<ManageServingRuntimeModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  servingRuntimeTemplates,
  editInfo,
}) => {
  const [createData, setCreateData, resetData, sizes] = useCreateServingRuntimeObject(editInfo);
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const namespace = currentProject.metadata.name;
  const tokenErrors = createData.tokens.filter((token) => token.error !== '').length > 0;
  const baseInputValueValid =
    createData.numReplicas >= 0 &&
    resourcesArePositive(createData.modelSize.resources) &&
    requestsUnderLimits(createData.modelSize.resources);
  const servingRuntimeTemplateNameValid = editInfo?.servingRuntime
    ? true
    : !!createData.servingRuntimeTemplateName;
  const inputValueValid = customServingRuntimesEnabled
    ? baseInputValueValid && createData.name && servingRuntimeTemplateNameValid
    : baseInputValueValid;
  const canCreate = !actionInProgress && !tokenErrors && inputValueValid;

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

  const updateModelServer = (
    fillData: CreatingServingRuntimeObject,
    servingRuntime: ServingRuntimeKind,
    secrets: SecretKind[],
  ): Promise<void> =>
    Promise.all([
      updateSecrets(
        fillData,
        servingRuntime.metadata.name,
        servingRuntime.metadata.namespace,
        secrets,
      ),
      updateServingRuntime(fillData, servingRuntime, customServingRuntimesEnabled),
    ])
      .then(() => {
        setActionInProgress(false);
        onBeforeClose(true);
      })
      .catch((e) => setErrorModal(e));

  const createModelServer = (
    fillData: CreatingServingRuntimeObject,
    servingRuntime: ServingRuntimeKind,
    namespace: string,
  ): Promise<ServingRuntimeKind | string | void> => {
    const servingRuntimeName = translateDisplayNameForK8s(fillData.name);

    return Promise.all<ServingRuntimeKind | string | void>([
      ...(currentProject.metadata.labels?.['modelmesh-enabled']
        ? [addSupportModelMeshProject(currentProject.metadata.name)]
        : []),
      createServingRuntime(fillData, namespace, servingRuntime, customServingRuntimesEnabled),
      setUpTokenAuth(fillData, servingRuntimeName, namespace),
    ])
      .then(() => {
        setActionInProgress(false);
        onBeforeClose(true);
      })
      .catch((e) => {
        setErrorModal(e);
      });
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    if (editInfo) {
      if (!editInfo.servingRuntime || !editInfo.secrets) {
        setErrorModal(new Error('Serving Runtime or Secrets not found'));
        return;
      }
      updateModelServer(createData, editInfo.servingRuntime, editInfo.secrets);
    } else {
      const servingRuntimeTemplate = servingRuntimeTemplates?.find(
        (template) =>
          getServingRuntimeNameFromTemplate(template) === createData.servingRuntimeTemplateName,
      );
      if (customServingRuntimesEnabled && !servingRuntimeTemplate) {
        setErrorModal(new Error('Serving Runtime Template not found'));
        return;
      }
      try {
        const servingRuntime = getServingRuntimeFromTemplate(servingRuntimeTemplate);
        createModelServer(createData, servingRuntime, namespace);
      } catch (e) {
        if (e instanceof Error) {
          setErrorModal(e);
        }
      }
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
              <ServingRuntimeTemplateSection
                data={createData}
                setData={setCreateData}
                templates={servingRuntimeTemplates}
                isEditing={!!editInfo}
              />
              <StackItem>
                <ServingRuntimeReplicaSection data={createData} setData={setCreateData} />
              </StackItem>
              <StackItem>
                <ServingRuntimeSizeSection
                  data={createData}
                  setData={setCreateData}
                  sizes={sizes}
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
