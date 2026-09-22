import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionGroup,
  Alert,
  Button,
  Checkbox,
  Flex,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  PageSection,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { useZodFormValidation } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { APIOptions } from 'mod-arch-core';
import { TrackingOutcome } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { createExternalModel, updateExternalModel } from '~/app/api/external-models';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import {
  CreateExternalModelRequest,
  ExternalModel,
  ProviderRef,
  UpdateExternalModelRequest,
} from '~/app/types/external-models';
import {
  DISTRIBUTE_EQUALLY_POPOVER_CONTENT,
  EXTERNAL_MODEL_FIELD_MAX_LENGTH,
  PROVIDER_REFS_ZERO_TOTAL_WEIGHT_MESSAGE,
} from '~/app/pages/external-models/const';
import {
  hasZeroTotalProviderRefWeight,
  setProviderRefWeightsEqually,
} from '~/app/pages/external-models/providerReferenceUtils';
import { createExternalModelFormSchema } from '~/app/pages/external-models/validations';
import {
  ExternalModelAddedProperties,
  ExternalModelProviderContext,
  ExternalModelProviderReferenceRemovedProperties,
  ExternalModelWeightsDistributedProperties,
  MaaSEvents,
  AddProviderReferenceClickedProperties,
  AddProviderReferenceSource,
  ExternalModelUpdatedProperties,
} from '~/app/types/event-tracking';
import AddProviderReferenceWizard from './AddProviderReferenceWizard';
import EditProviderReferenceModal from './EditProviderReferenceModal';
import ProviderReferencesTable from './ProviderReferencesTable';

type CreateExternalModelFormProps = {
  namespace: string;
  returnTo: string;
  externalModel?: ExternalModel;
  addProviderReferenceSource?: AddProviderReferenceSource;
};

const CreateExternalModelForm: React.FC<CreateExternalModelFormProps> = ({
  namespace,
  returnTo,
  externalModel,
  addProviderReferenceSource = AddProviderReferenceSource.TOOLBAR,
}) => {
  const navigate = useNavigate();
  const { externalProviders, refreshExternalModels } = useExternalModelsContext();
  const isEditing = !!externalModel;

  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData(
    externalModel
      ? {
          namespace,
          initialData: {
            name: externalModel.displayName ?? externalModel.name,
            k8sName: externalModel.name,
            description: externalModel.description ?? '',
          },
        }
      : { namespace },
  );

  const [providerRefs, setProviderRefs] = React.useState<ProviderRef[]>(
    () => externalModel?.providerRefs ?? [],
  );
  const [providerRefsTouched, setProviderRefsTouched] = React.useState(false);
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = React.useState(false);
  const [isEditProviderModalOpen, setIsEditProviderModalOpen] = React.useState(false);
  const [editingProviderRefIndex, setEditingProviderRefIndex] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const formData = React.useMemo(
    () => ({
      modelName: nameDescData.name,
      providerRefs,
    }),
    [nameDescData.name, providerRefs],
  );

  const externalModelFormSchema = React.useMemo(
    () => createExternalModelFormSchema(externalProviders),
    [externalProviders],
  );

  const { getFieldValidation } = useZodFormValidation(formData, externalModelFormSchema);

  const providerRefsErrors = providerRefsTouched ? getFieldValidation(['providerRefs'], true) : [];
  const providerRefsValidationError =
    providerRefsErrors.length > 0 ? providerRefsErrors[0].message : undefined;
  const showZeroTotalWeightWarning = hasZeroTotalProviderRefWeight(providerRefs);

  const isSubmitDisabled =
    nameDescData.name.trim() === '' || providerRefs.length === 0 || isSubmitting;

  const handleSubmit = async () => {
    setProviderRefsTouched(true);

    if (
      isSubmitDisabled ||
      !isK8sNameDescriptionDataValid(nameDescData) ||
      getFieldValidation(['modelName'], true).length > 0 ||
      getFieldValidation(['providerRefs'], true).length > 0
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const trimmedName = nameDescData.name.trim();

    try {
      const apiOpts: APIOptions = {};

      if (externalModel) {
        const request: UpdateExternalModelRequest = {
          displayName: trimmedName,
          description: nameDescData.description.trim(),
          providerRefs,
        };
        await updateExternalModel()(apiOpts, namespace, externalModel.name, request);

        fireFormTrackingEvent(MaaSEvents.EXTERNAL_MODEL_UPDATED, {
          outcome: TrackingOutcome.submit,
          providerRefCount: providerRefs.length,
          hasDescription: nameDescData.description.trim() !== '',
          success: true,
        } satisfies ExternalModelUpdatedProperties);
      } else {
        const request: CreateExternalModelRequest = {
          name: nameDescData.k8sName.value,
          namespace,
          displayName: trimmedName,
          modelName: nameDescData.k8sName.value,
          description: nameDescData.description.trim() || undefined,
          providerRefs,
        };
        await createExternalModel()(apiOpts, request);

        fireFormTrackingEvent(MaaSEvents.EXTERNAL_MODEL_ADDED, {
          outcome: TrackingOutcome.submit,
          providerRefCount: providerRefs.length,
          hasDescription: nameDescData.description.trim() !== '',
          success: true,
        } satisfies ExternalModelAddedProperties);
      }

      refreshExternalModels();
      navigate(returnTo);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? 'update' : 'create'} external model`,
      );
      setIsSubmitting(false);
      if (externalModel) {
        fireFormTrackingEvent(MaaSEvents.EXTERNAL_MODEL_UPDATED, {
          outcome: TrackingOutcome.submit,
          providerRefCount: providerRefs.length,
          hasDescription: nameDescData.description.trim() !== '',
          success: false,
        } satisfies ExternalModelUpdatedProperties);
      } else {
        fireFormTrackingEvent(MaaSEvents.EXTERNAL_MODEL_ADDED, {
          outcome: TrackingOutcome.submit,
          providerRefCount: providerRefs.length,
          hasDescription: nameDescData.description.trim() !== '',
          success: false,
        } satisfies ExternalModelAddedProperties);
      }
    }
  };

  const handleAddProviderRef = (providerRef: ProviderRef) => {
    setProviderRefsTouched(true);
    setProviderRefs((prev) => [...prev, providerRef]);
  };

  const handleSaveProviderRef = (providerRef: ProviderRef) => {
    if (editingProviderRefIndex === null) {
      return;
    }
    setProviderRefsTouched(true);
    setProviderRefs((prev) =>
      prev.map((ref, index) => (index === editingProviderRefIndex ? providerRef : ref)),
    );
  };

  const handleRemoveProviderRef = (index: number) => {
    setProviderRefsTouched(true);
    setProviderRefs((prev) => prev.filter((_, i) => i !== index));
    fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODEL_PROVIDER_REFERENCE_REMOVED, {
      remainingProviderCount: providerRefs.length - 1,
      context: externalModel
        ? ExternalModelProviderContext.EDIT
        : ExternalModelProviderContext.CREATE,
    } satisfies ExternalModelProviderReferenceRemovedProperties);
  };

  const handleProviderRefWeightChange = (index: number, weight: number) => {
    setProviderRefsTouched(true);
    setProviderRefs((prev) =>
      prev.map((ref, refIndex) => (refIndex === index ? { ...ref, weight } : ref)),
    );
  };

  const handleEditProviderRef = (index: number) => {
    setEditingProviderRefIndex(index);
    setIsEditProviderModalOpen(true);
  };

  const handleCloseAddProviderModal = () => {
    setIsAddProviderModalOpen(false);
  };

  const handleCloseEditProviderModal = () => {
    setIsEditProviderModalOpen(false);
    setEditingProviderRefIndex(null);
  };

  const handleOpenAddProviderModal = () => {
    setProviderRefsTouched(true);
    setIsAddProviderModalOpen(true);
    fireMiscTrackingEvent(MaaSEvents.ADD_PROVIDER_REFERENCE_CLICKED, {
      source: addProviderReferenceSource,
      hasExistingProviders: formData.providerRefs.length > 0,
      context: externalModel
        ? ExternalModelProviderContext.EDIT
        : ExternalModelProviderContext.CREATE,
    } satisfies AddProviderReferenceClickedProperties);
  };

  const handleDistributeEqually = () => {
    setProviderRefsTouched(true);
    setProviderRefs((prev) => setProviderRefWeightsEqually(prev));
    fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODEL_WEIGHTS_DISTRIBUTED, {
      providerRefCount: providerRefs.length,
      context: externalModel
        ? ExternalModelProviderContext.EDIT
        : ExternalModelProviderContext.CREATE,
    } satisfies ExternalModelWeightsDistributedProperties);
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Form maxWidth="750px">
        <FormSection>
          <FormGroup label="Project" fieldId="external-model-project" isRequired>
            <TextInput
              id="external-model-project"
              data-testid="external-model-project"
              value={namespace}
              isDisabled
            />
          </FormGroup>

          <K8sNameDescriptionField
            data={nameDescData}
            onDataChange={onNameDescChange}
            dataTestId="external-model-name-desc"
            nameLabel="Name"
            maxLength={EXTERNAL_MODEL_FIELD_MAX_LENGTH}
          />
        </FormSection>

        <FormSection title="Provider references" titleElement="h2">
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Configure references to the providers that serve this model. A provider reference
                defines a model&apos;s relationship to a provider, and includes the provider&apos;s
                model ID, API format, and request path. If a model references multiple providers,
                requests are distributed based on each reference&apos;s routing weight.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>

          <Stack hasGutter>
            <StackItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                gap={{ default: 'gapMd' }}
                flexWrap={{ default: 'wrap' }}
              >
                <Button
                  variant="secondary"
                  icon={<PlusCircleIcon />}
                  onClick={handleOpenAddProviderModal}
                  data-testid="add-provider-reference-button"
                >
                  Add provider reference
                </Button>
                {providerRefs.length > 1 && (
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    spaceItems={{ default: 'spaceItemsXs' }}
                  >
                    <Button
                      variant="link"
                      isInline
                      onClick={handleDistributeEqually}
                      data-testid="distribute-equally-button"
                    >
                      Distribute equally
                    </Button>
                    <FieldGroupHelpLabelIcon
                      content={DISTRIBUTE_EQUALLY_POPOVER_CONTENT}
                      buttonTestId="distribute-equally-help"
                    />
                  </Flex>
                )}
              </Flex>
            </StackItem>

            {providerRefs.length > 0 && (
              <StackItem>
                <ProviderReferencesTable
                  providerRefs={providerRefs}
                  externalProviders={externalProviders}
                  onWeightChange={handleProviderRefWeightChange}
                  onEdit={handleEditProviderRef}
                  onRemove={handleRemoveProviderRef}
                />
              </StackItem>
            )}

            {showZeroTotalWeightWarning && (
              <StackItem>
                <Alert
                  variant="warning"
                  isInline
                  isPlain
                  title={PROVIDER_REFS_ZERO_TOTAL_WEIGHT_MESSAGE}
                  data-testid="provider-refs-zero-total-weight-warning"
                />
              </StackItem>
            )}

            {providerRefsValidationError && (
              <StackItem>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">{providerRefsValidationError}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </StackItem>
            )}
          </Stack>
        </FormSection>

        <FormSection title="Model availability" titleElement="h2">
          <Checkbox
            id="external-model-maas-availability"
            data-testid="external-model-maas-availability"
            label="Available as a Model as a Service (MaaS)"
            description="External models are served through the MaaS gateway. This model will be available to select users in the cluster after an administrator configures a subscription and authorization policy."
            isChecked
            isDisabled
          />
        </FormSection>

        {submitError && (
          <Alert
            variant="danger"
            isInline
            title={`Failed to ${isEditing ? 'update' : 'add'} external model`}
          >
            {submitError}
          </Alert>
        )}

        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={isSubmitDisabled}
            isLoading={isSubmitting}
            data-testid={
              isEditing ? 'update-external-model-button' : 'create-external-model-button'
            }
          >
            {isEditing
              ? isSubmitting
                ? 'Saving...'
                : 'Save'
              : isSubmitting
                ? 'Adding...'
                : 'Add external model'}
          </Button>
          <Button
            variant="link"
            isDisabled={isSubmitting}
            data-testid="cancel-external-model-button"
            onClick={() => {
              if (externalModel) {
                fireFormTrackingEvent(MaaSEvents.EXTERNAL_MODEL_UPDATED, {
                  outcome: TrackingOutcome.cancel,
                  success: false,
                  providerRefCount: providerRefs.length,
                  hasDescription: nameDescData.description.trim() !== '',
                } satisfies ExternalModelUpdatedProperties);
              } else {
                fireFormTrackingEvent(MaaSEvents.EXTERNAL_MODEL_ADDED, {
                  outcome: TrackingOutcome.cancel,
                  success: false,
                  providerRefCount: providerRefs.length,
                  hasDescription: nameDescData.description.trim() !== '',
                } satisfies ExternalModelAddedProperties);
              }
              navigate(returnTo);
            }}
          >
            Cancel
          </Button>
        </ActionGroup>
      </Form>

      <AddProviderReferenceWizard
        isOpen={isAddProviderModalOpen}
        namespace={namespace}
        externalProviders={externalProviders}
        onClose={handleCloseAddProviderModal}
        onAdd={handleAddProviderRef}
        eventContext={
          externalModel ? ExternalModelProviderContext.EDIT : ExternalModelProviderContext.CREATE
        }
      />

      {editingProviderRefIndex !== null && (
        <EditProviderReferenceModal
          isOpen={isEditProviderModalOpen}
          providerRef={providerRefs[editingProviderRefIndex]}
          externalProviders={externalProviders}
          onClose={handleCloseEditProviderModal}
          onSave={handleSaveProviderRef}
        />
      )}
    </PageSection>
  );
};

export default CreateExternalModelForm;
