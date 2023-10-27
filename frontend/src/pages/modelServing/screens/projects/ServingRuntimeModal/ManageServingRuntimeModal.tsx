import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormSection,
  Modal,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import { HelpIcon } from '@patternfly/react-icons';
import {
  isGpuDisabled,
  useCreateServingRuntimeObject,
} from '~/pages/modelServing/screens/projects/utils';
import {
  ServingRuntimeKind,
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
  isModelServerEditInfoChanged,
  requestsUnderLimits,
  resourcesArePositive,
  setUpTokenAuth,
} from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getServingRuntimeFromName } from '~/pages/modelServing/customServingRuntimes/utils';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import useServingAccelerator from '~/pages/modelServing/screens/projects/useServingAccelerator';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { ServingRuntimeEditInfo } from '~/pages/modelServing/screens/types';
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
    editInfo?: ServingRuntimeEditInfo;
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
  const [acceleratorState, setAcceleratorState, resetAcceleratorData] = useServingAccelerator(
    editInfo?.servingRuntime,
  );
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const namespace = currentProject.metadata.name;

  const [allowCreate] = useAccessReview({
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
  const isDisabled =
    actionInProgress ||
    tokenErrors ||
    !inputValueValid ||
    !isModelServerEditInfoChanged(createData, sizes, acceleratorState, editInfo);

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
    resetAcceleratorData();
  };

  const setErrorModal = (error: Error) => {
    setError(error);
    setActionInProgress(false);
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    if (!servingRuntimeSelected) {
      setErrorModal(
        new Error(
          'Error, the Serving Runtime selected might be malformed or could not have been retrieved.',
        ),
      );
      return;
    }
    const servingRuntimeData = {
      ...createData,
      existingTolerations: servingRuntimeSelected.spec.tolerations || [],
    };
    const servingRuntimeName = translateDisplayNameForK8s(servingRuntimeData.name);
    const createRolebinding = servingRuntimeData.tokenAuth && allowCreate;

    const accelerator = isGpuDisabled(servingRuntimeSelected)
      ? { count: 0, accelerators: [], useExisting: false }
      : acceleratorState;

    Promise.all<ServingRuntimeKind | string | void>([
      ...(editInfo?.servingRuntime
        ? [
            updateServingRuntime({
              data: servingRuntimeData,
              existingData: editInfo?.servingRuntime,
              isCustomServingRuntimesEnabled: customServingRuntimesEnabled,
              opts: {
                dryRun: true,
              },
              acceleratorState: accelerator,
            }),
          ]
        : [
            createServingRuntime({
              data: servingRuntimeData,
              namespace,
              servingRuntime: servingRuntimeSelected,
              isCustomServingRuntimesEnabled: customServingRuntimesEnabled,
              opts: {
                dryRun: true,
              },
              acceleratorState: accelerator,
            }),
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
          ...(currentProject.metadata.labels?.['modelmesh-enabled'] === undefined && allowCreate
            ? [addSupportModelMeshProject(currentProject.metadata.name)]
            : []),
          ...(editInfo?.servingRuntime
            ? [
                updateServingRuntime({
                  data: servingRuntimeData,
                  existingData: editInfo?.servingRuntime,
                  isCustomServingRuntimesEnabled: customServingRuntimesEnabled,

                  acceleratorState: accelerator,
                }),
              ]
            : [
                createServingRuntime({
                  data: servingRuntimeData,
                  namespace,
                  servingRuntime: servingRuntimeSelected,
                  isCustomServingRuntimesEnabled: customServingRuntimesEnabled,
                  acceleratorState: accelerator,
                }),
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
      title={`${editInfo ? 'Edit' : 'Add'} model server`}
      description="A model server specifies resources available for use by one or more supported models, and includes a serving runtime."
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      footer={
        <DashboardModalFooter
          submitLabel={editInfo ? 'Update' : 'Add'}
          onSubmit={submit}
          isSubmitDisabled={isDisabled}
          onCancel={() => onBeforeClose(false)}
          alertTitle={`Error ${editInfo ? 'updating' : 'creating'} model server`}
          error={error}
        />
      }
    >
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
            acceleratorState={acceleratorState}
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
              acceleratorState={acceleratorState}
              setAcceleratorState={setAcceleratorState}
            />
          </StackItem>
          {!allowCreate && (
            <StackItem>
              <Popover
                removeFindDomNode
                showClose
                bodyContent="Model route and token authorization can only be changed by administrator users."
              >
                <Button variant="link" icon={<HelpIcon />} isInline>
                  {"Why can't I change the model route and token authorization fields?"}
                </Button>
              </Popover>
            </StackItem>
          )}
          <StackItem>
            <FormSection title="Model route" titleElement="div">
              <FormGroup>
                <Checkbox
                  label="Make deployed models available through an external route"
                  id="alt-form-checkbox-route"
                  name="alt-form-checkbox-route"
                  isChecked={createData.externalRoute}
                  isDisabled={!allowCreate}
                  onChange={(check) => {
                    setCreateData('externalRoute', check);
                    if (check && allowCreate) {
                      setCreateData('tokenAuth', check);
                    }
                  }}
                />
              </FormGroup>
            </FormSection>
          </StackItem>
          <StackItem>
            <ServingRuntimeTokenSection
              data={createData}
              setData={setCreateData}
              allowCreate={allowCreate}
            />
          </StackItem>
          {createData.externalRoute && !createData.tokenAuth && (
            <StackItem>
              <Alert
                id="external-route-no-token-alert"
                variant="warning"
                isInline
                title="Making models available by external routes without requiring authorization can lead to security vulnerabilities."
              />
            </StackItem>
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default ManageServingRuntimeModal;
