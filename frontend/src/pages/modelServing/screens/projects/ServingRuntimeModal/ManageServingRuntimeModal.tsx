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
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  isGpuDisabled,
  useCreateServingRuntimeObject,
} from '~/pages/modelServing/screens/projects/utils';
import {
  ServingRuntimeKind,
  SecretKind,
  TemplateKind,
  ProjectKind,
  AccessReviewResourceAttributes,
} from '~/k8sTypes';
import {
  addSupportModelMeshProject,
  createServingRuntime,
  updateServingRuntime,
  useAccessReview,
} from '~/api';
import {
  requestsUnderLimits,
  resourcesArePositive,
  setUpTokenAuth,
} from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getServingRuntimeFromName } from '~/pages/modelServing/customServingRuntimes/utils';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import ServingRuntimeReplicaSection from './ServingRuntimeReplicaSection';
import ServingRuntimeSizeSection from './ServingRuntimeSizeSection';
import ServingRuntimeTokenSection from './ServingRuntimeTokenSection';
import ServingRuntimeTemplateSection from './ServingRuntimeTemplateSection';

type ManageServingRuntimeModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
  currentProject: ProjectKind;
} & EitherOrNone<
  { servingRuntimeTemplates?: TemplateKind[] },
  {
    editInfo?: {
      servingRuntime?: ServingRuntimeKind;
      secrets: SecretKind[];
    };
  }
>;

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
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

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...accessReviewResource,
    namespace,
  });

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
  const canCreate = !actionInProgress && !tokenErrors && inputValueValid && rbacLoaded;

  const servingRuntimeSelected = React.useMemo(
    () =>
      editInfo?.servingRuntime ||
      getServingRuntimeFromName(createData.servingRuntimeTemplateName, servingRuntimeTemplates),
    [editInfo, servingRuntimeTemplates, createData.servingRuntimeTemplateName],
  );

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

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    if (!servingRuntimeSelected) {
      setErrorModal(new Error('Error retrieving Serving Runtime'));
      return;
    }
    const servingRuntimeData = {
      ...createData,
      gpus: isGpuDisabled(servingRuntimeSelected) ? 0 : createData.gpus,
    };
    const servingRuntimeName = translateDisplayNameForK8s(servingRuntimeData.name);
    const createRolebinding = servingRuntimeData.tokenAuth && allowCreate;

    Promise.all<ServingRuntimeKind | string | void>([
      ...(editInfo?.servingRuntime
        ? [
            updateServingRuntime(
              servingRuntimeData,
              editInfo?.servingRuntime,
              customServingRuntimesEnabled,
              {
                dryRun: true,
              },
            ),
          ]
        : [
            createServingRuntime(
              servingRuntimeData,
              namespace,
              servingRuntimeSelected,
              customServingRuntimesEnabled,
              {
                dryRun: true,
              },
            ),
          ]),
      setUpTokenAuth(
        servingRuntimeData,
        servingRuntimeName,
        namespace,
        createRolebinding,
        editInfo?.secrets,
        {
          dryRun: true,
        },
      ),
    ])
      .then(() =>
        Promise.all<ServingRuntimeKind | string | void>([
          ...(currentProject.metadata.labels?.['modelmesh-enabled'] && allowCreate
            ? [addSupportModelMeshProject(currentProject.metadata.name)]
            : []),
          ...(editInfo?.servingRuntime
            ? [
                updateServingRuntime(
                  servingRuntimeData,
                  editInfo?.servingRuntime,
                  customServingRuntimesEnabled,
                ),
              ]
            : [
                createServingRuntime(
                  servingRuntimeData,
                  namespace,
                  servingRuntimeSelected,
                  customServingRuntimesEnabled,
                ),
              ]),
          setUpTokenAuth(
            servingRuntimeData,
            servingRuntimeName,
            namespace,
            createRolebinding,
            editInfo?.secrets,
          ),
        ])
          .then(() => {
            setActionInProgress(false);
            onBeforeClose(true);
          })
          .catch((e) => {
            setErrorModal(e);
          }),
      )
      .catch((e) => {
        setErrorModal(e);
      });
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
                templates={servingRuntimeTemplates || []}
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
                  servingRuntimeSelected={servingRuntimeSelected}
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
                <ServingRuntimeTokenSection
                  data={createData}
                  setData={setCreateData}
                  allowCreate={allowCreate}
                  rbacLoaded={rbacLoaded}
                />
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
