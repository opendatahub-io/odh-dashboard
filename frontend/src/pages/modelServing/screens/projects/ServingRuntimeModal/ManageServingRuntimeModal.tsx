import * as React from 'react';
import { Form, Stack, StackItem } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
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
import useServingAcceleratorProfileFormState from '~/pages/modelServing/screens/projects/useServingAcceleratorProfileFormState';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import { ServingRuntimeEditInfo } from '~/pages/modelServing/screens/types';
import { useAccessReview } from '~/api';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '~/concepts/analyticsTracking/trackingProperties';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import ServingRuntimeReplicaSection from './ServingRuntimeReplicaSection';
import ServingRuntimeSizeSection from './ServingRuntimeSizeSection';
import ServingRuntimeTemplateSection from './ServingRuntimeTemplateSection';
import AuthServingRuntimeSection from './AuthServingRuntimeSection';

type ManageServingRuntimeModalProps = {
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

const modelServerAddedName = 'Model Server Added';
const modelServerEditName = 'Model Server Modified';

const ManageServingRuntimeModal: React.FC<ManageServingRuntimeModalProps> = ({
  onClose,
  currentProject,
  servingRuntimeTemplates,
  editInfo,
}) => {
  const [createData, setCreateData, , sizes] = useCreateServingRuntimeObject(editInfo);
  const {
    formData: selectedAcceleratorProfile,
    setFormData: setSelectedAcceleratorProfile,
    initialState: initialAcceleratorProfile,
  } = useServingAcceleratorProfileFormState(editInfo?.servingRuntime);

  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const { data: modelServerNameDesc, onDataChange: setModelServerNameDesc } =
    useK8sNameDescriptionFieldData({
      initialData: editInfo?.servingRuntime,
      safePrefix: !customServingRuntimesEnabled ? 'model-server' : undefined,
      staticPrefix: !customServingRuntimesEnabled,
    });

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
    !isK8sNameDescriptionDataValid(modelServerNameDesc) ||
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

  React.useEffect(() => {
    setCreateData('name', modelServerNameDesc.name);
    setCreateData('k8sName', modelServerNameDesc.k8sName.value);
  }, [modelServerNameDesc, setCreateData]);

  const onBeforeClose = (submitted: boolean) => {
    if (!submitted) {
      fireFormTrackingEvent(editInfo ? modelServerEditName : modelServerAddedName, {
        outcome: TrackingOutcome.cancel,
      });
    }

    onClose(submitted);
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

    const props: FormTrackingEventProperties = {
      outcome: TrackingOutcome.submit,
      type: createData.servingRuntimeTemplateName,
      size: createData.modelSize.name,
    };

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
      .then(() => {
        props.success = true;
        fireFormTrackingEvent(editInfo ? modelServerEditName : modelServerAddedName, props);
        onSuccess();
      })
      .catch((e) => {
        props.success = false;
        props.errorMessage = e;
        fireFormTrackingEvent(editInfo ? modelServerEditName : modelServerAddedName, props);
        setErrorModal(e);
      });
  };

  return (
    <Modal
      title={`${editInfo ? 'Edit' : 'Add'} model server`}
      description="A model server specifies resources available for use by one or more supported models, and includes a serving runtime."
      variant="medium"
      isOpen
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
            <K8sNameDescriptionField
              data={modelServerNameDesc}
              onDataChange={setModelServerNameDesc}
              dataTestId="serving-runtime"
              nameLabel="Model server name"
              hideDescription
            />
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
