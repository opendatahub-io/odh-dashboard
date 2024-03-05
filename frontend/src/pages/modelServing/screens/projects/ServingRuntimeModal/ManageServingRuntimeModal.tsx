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
  getUniqueId,
} from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import { HelpIcon } from '@patternfly/react-icons';
import {
  submitServingRuntimeResourcesWithDryRun,
  useCreateServingRuntimeObject,
} from '~/pages/modelServing/screens/projects/utils';
import { TemplateKind, ProjectKind, AccessReviewResourceAttributes } from '~/k8sTypes';
import { useAccessReview } from '~/api';
import {
  isModelServerEditInfoChanged,
  requestsUnderLimits,
  resourcesArePositive,
} from '~/pages/modelServing/utils';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import { getServingRuntimeFromName } from '~/pages/modelServing/customServingRuntimes/utils';
import useServingAcceleratorProfile from '~/pages/modelServing/screens/projects/useServingAcceleratorProfile';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import { ServingRuntimeEditInfo } from '~/pages/modelServing/screens/types';
import ServingRuntimeReplicaSection from './ServingRuntimeReplicaSection';
import ServingRuntimeSizeSection from './ServingRuntimeSizeSection';
import ServingRuntimeTokenSection from './ServingRuntimeTokenSection';
import ServingRuntimeTemplateSection from './ServingRuntimeTemplateSection';
import ServingRuntimeNameSection from './ServingRuntimeNameSection';

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
  const [acceleratorProfileState, setAcceleratorProfileState, resetAcceleratorProfileData] =
    useServingAcceleratorProfile(editInfo?.servingRuntime);
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
    !isModelServerEditInfoChanged(createData, sizes, acceleratorProfileState, editInfo);

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
    resetAcceleratorProfileData();
  };

  const setErrorModal = (e: Error) => {
    setError(e);
    setActionInProgress(false);
  };

  const onSuccess = () => {
    onBeforeClose(true);
  };

  const submit = () => {
    setError(undefined);
    setActionInProgress(true);

    submitServingRuntimeResourcesWithDryRun(
      servingRuntimeSelected,
      createData,
      customServingRuntimesEnabled,
      namespace,
      editInfo,
      allowCreate,
      acceleratorProfileState,
      NamespaceApplicationCase.MODEL_MESH_PROMOTION,
      currentProject,
      undefined,
      true,
    )
      .then(() => onSuccess())
      .catch((e) => {
        setErrorModal(e);
      });
  };

  const createNewToken = React.useCallback(() => {
    const name = 'default-name';
    const duplicated = createData.tokens.filter((token) => token.name === name);
    const duplicatedError = duplicated.length > 0 ? 'Duplicates are invalid' : '';
    setCreateData('tokens', [
      ...createData.tokens,
      {
        name,
        uuid: getUniqueId('ml'),
        error: duplicatedError,
      },
    ]);
  }, [createData.tokens, setCreateData]);

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
          <StackItem>
            <ServingRuntimeNameSection data={createData} setData={setCreateData} />
          </StackItem>
          <StackItem>
            <ServingRuntimeTemplateSection
              data={createData}
              setData={setCreateData}
              templates={servingRuntimeTemplates || []}
              isEditing={!!editInfo}
              acceleratorProfileState={acceleratorProfileState}
            />
          </StackItem>
          <StackItem>
            <ServingRuntimeReplicaSection
              data={createData}
              setData={setCreateData}
              infoContent="Consider network traffic and failover scenarios when specifying the number of model
                server replicas."
            />
          </StackItem>
          <StackItem>
            <ServingRuntimeSizeSection
              data={createData}
              setData={setCreateData}
              sizes={sizes}
              servingRuntimeSelected={servingRuntimeSelected}
              acceleratorProfileState={acceleratorProfileState}
              setAcceleratorProfileState={setAcceleratorProfileState}
              infoContent="Select a server size that will accommodate your largest model. See the product documentation for more information."
            />
          </StackItem>
          {!allowCreate && (
            <StackItem>
              <Popover
                showClose
                bodyContent="Model route and token authorization can only be changed by administrator users."
              >
                <Button variant="link" icon={<HelpIcon />} isInline>
                  Why can&apos;t I change the model route and token authorization fields?
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
                  data-testid="alt-form-checkbox-route"
                  name="alt-form-checkbox-route"
                  isChecked={createData.externalRoute}
                  isDisabled={!allowCreate}
                  onChange={(e, check) => {
                    setCreateData('externalRoute', check);
                    if (check && allowCreate) {
                      setCreateData('tokenAuth', check);
                      if (createData.tokens.length === 0) {
                        createNewToken();
                      }
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
              createNewToken={createNewToken}
            />
          </StackItem>
          {createData.externalRoute && !createData.tokenAuth && (
            <StackItem>
              <Alert
                id="external-route-no-token-alert"
                data-testid="external-route-no-token-alert"
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
