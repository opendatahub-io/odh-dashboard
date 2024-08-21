import * as React from 'react';
import { Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import { EitherOrNone } from '@openshift/dynamic-plugin-sdk';
import {
  submitServingRuntimeResourcesWithDryRun,
  useCreateServingRuntimeObject,
} from '~/pages/modelServing/screens/projects/utils';
import { TemplateKind, ProjectKind, AccessReviewResourceAttributes } from '~/k8sTypes';
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
import { useAccessReview } from '~/api';
import { AcceleratorProfileSelectFieldState } from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import ServingRuntimeReplicaSection from './ServingRuntimeReplicaSection';
import ServingRuntimeSizeSection from './ServingRuntimeSizeSection';
import ServingRuntimeTemplateSection from './ServingRuntimeTemplateSection';
import ServingRuntimeNameSection from './ServingRuntimeNameSection';
import AuthServingRuntimeSection from './AuthServingRuntimeSection';

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
  const initialAcceleratorProfile = useServingAcceleratorProfile(editInfo?.servingRuntime);
  const [selectedAcceleratorProfile, setSelectedAcceleratorProfile] =
    useGenericObjectState<AcceleratorProfileSelectFieldState>({
      profile: undefined,
      count: 0,
      useExistingSettings: false,
    });
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
    !isModelServerEditInfoChanged(
      createData,
      sizes,
      initialAcceleratorProfile,
      selectedAcceleratorProfile,
      editInfo,
    );

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
      initialAcceleratorProfile,
      selectedAcceleratorProfile,
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
              selectedAcceleratorProfile={selectedAcceleratorProfile}
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
              acceleratorProfileState={initialAcceleratorProfile}
              selectedAcceleratorProfile={selectedAcceleratorProfile}
              setSelectedAcceleratorProfile={setSelectedAcceleratorProfile}
              infoContent="Select a server size that will accommodate your largest model. See the product documentation for more information."
            />
          </StackItem>
          <AuthServingRuntimeSection
            data={createData}
            setData={setCreateData}
            allowCreate={allowCreate}
            publicRoute
          />
        </Stack>
      </Form>
    </Modal>
  );
};

export default ManageServingRuntimeModal;
