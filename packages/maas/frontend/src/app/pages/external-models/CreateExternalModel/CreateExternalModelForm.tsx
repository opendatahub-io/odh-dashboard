import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionGroup,
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormSection,
  FormHelperText,
  HelperText,
  HelperTextItem,
  PageSection,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import { useZodFormValidation } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { APIOptions } from 'mod-arch-core';
import { z } from 'zod';
import { createExternalModel } from '~/app/api/external-models';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { CreateExternalModelRequest, ProviderRef } from '~/app/types/external-models';
import AddProviderReferenceModal from './AddProviderReferenceModal';
import EditProviderReferenceModal from './EditProviderReferenceModal';
import ProviderReferencesTable from './ProviderReferencesTable';

const externalModelFormSchema = z.object({
  providerRefs: z.array(z.unknown()).min(1, 'Add at least one provider reference'),
});

type CreateExternalModelFormProps = {
  namespace: string;
  returnTo: string;
};

const CreateExternalModelForm: React.FC<CreateExternalModelFormProps> = ({
  namespace,
  returnTo,
}) => {
  const navigate = useNavigate();
  const { externalProviders, refreshExternalModels } = useExternalModelsContext();

  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData({
    namespace,
  });

  const [providerRefs, setProviderRefs] = React.useState<ProviderRef[]>([]);
  const [providerRefsTouched, setProviderRefsTouched] = React.useState(false);
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = React.useState(false);
  const [isEditProviderModalOpen, setIsEditProviderModalOpen] = React.useState(false);
  const [editingProviderRefIndex, setEditingProviderRefIndex] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const { getFieldValidation } = useZodFormValidation({ providerRefs }, externalModelFormSchema);

  const providerRefsValidationError =
    providerRefsTouched && getFieldValidation(['providerRefs'], true).length > 0
      ? getFieldValidation(['providerRefs'], true)[0].message
      : undefined;

  const canSubmit =
    isK8sNameDescriptionDataValid(nameDescData) &&
    nameDescData.name.trim() !== '' &&
    getFieldValidation(undefined, true).length === 0 &&
    !isSubmitting;

  const handleSubmit = async () => {
    setProviderRefsTouched(true);
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const request: CreateExternalModelRequest = {
      name: nameDescData.k8sName.value,
      namespace,
      modelName: nameDescData.name.trim(),
      description: nameDescData.description.trim() || undefined,
      providerRefs,
    };

    try {
      const apiOpts: APIOptions = {};
      await createExternalModel()(apiOpts, request);
      refreshExternalModels();
      navigate(returnTo);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create external model');
      setIsSubmitting(false);
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
    setIsAddProviderModalOpen(true);
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Form maxWidth="750px">
        <FormSection title="Model details" titleElement="h2">
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
            namePlaceholder="e.g. GPT-4 Turbo"
            nameHelperText="The client-facing model name. Consumers use this to identify the model in API requests."
            descriptionPlaceholder="Optional description of this external model"
          />
        </FormSection>

        <FormSection title="Provider reference configuration" titleElement="h2">
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Configure which external providers serve this model and how traffic is distributed.
                A provider reference links this model to an existing provider connection and
                specifies the target model ID, API format, and traffic weight.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>

          <Stack hasGutter>
            <StackItem>
              <Button
                variant="secondary"
                icon={<PlusCircleIcon />}
                onClick={handleOpenAddProviderModal}
                data-testid="add-provider-reference-button"
              >
                Add provider reference
              </Button>
            </StackItem>

            {providerRefs.length === 0 && !providerRefsTouched && (
              <StackItem>
                <Alert
                  variant="info"
                  isInline
                  isPlain
                  title="Add at least one provider reference to configure how this model routes inference traffic."
                  data-testid="provider-refs-required-info"
                />
              </StackItem>
            )}

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

        <FormSection title="Availability" titleElement="h2">
          <Checkbox
            id="external-model-maas-availability"
            data-testid="external-model-maas-availability"
            label="Available as a Model as a Service (MaaS)"
            description="External models are served through the MaaS gateway. This model will be available cluster-wide once a subscription and authorization policy are configured in MaaS governance."
            isChecked
            isDisabled
          />
        </FormSection>

        {submitError && (
          <Alert variant="danger" isInline title="Failed to create external model">
            {submitError}
          </Alert>
        )}

        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={!canSubmit}
            isLoading={isSubmitting}
            data-testid="create-external-model-button"
          >
            {isSubmitting ? 'Adding...' : 'Add external model'}
          </Button>
          <Button
            variant="link"
            onClick={() => navigate(returnTo)}
            isDisabled={isSubmitting}
            data-testid="cancel-create-external-model-button"
          >
            Cancel
          </Button>
        </ActionGroup>
      </Form>

      <AddProviderReferenceModal
        isOpen={isAddProviderModalOpen}
        namespace={namespace}
        externalProviders={externalProviders}
        onClose={handleCloseAddProviderModal}
        onAdd={handleAddProviderRef}
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
