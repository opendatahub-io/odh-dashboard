import React from 'react';
import {
  Alert,
  Flex,
  FlexItem,
  Button,
  TextInput,
  TextArea,
  Title,
  Split,
  SplitItem,
  MenuToggle,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { useCreatePrompt, useLatestPromptVersion } from './usePromptQueries';

export default function CreatePrompt({ onClose }: { onClose: () => void }): React.ReactNode {
  const {
    dirtyPrompt,
    setActivePrompt,
    setDirtyPrompt,
    setIsPromptManagementModalOpen,
    modalMode,
  } = usePlaygroundStore();
  const updateSystemInstruction = useChatbotConfigStore((state) => state.updateSystemInstruction);
  const isEditMode = modalMode === 'edit';
  const { latestVersion, isLoading: isLoadingVersion } = useLatestPromptVersion(
    isEditMode ? (dirtyPrompt?.name ?? null) : null,
  );
  const nextVersion = latestVersion != null ? latestVersion + 1 : null;
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const { createPrompt, isCreating } = useCreatePrompt({
    onSuccess: (newPrompt) => {
      setActivePrompt(newPrompt);
      const instruction =
        newPrompt.template ?? newPrompt.messages?.find((m) => m.role === 'system')?.content ?? '';
      updateSystemInstruction('default', instruction);
      setIsPromptManagementModalOpen(false);
    },
    onError: (error) => {
      if (error.message.toLowerCase().includes('already exists')) {
        setNameError('A prompt with this name already exists. Choose a different name.');
      } else {
        setSaveError(error.message || 'An error occurred while saving the prompt.');
      }
    },
  });

  const handleSave = () => {
    if (!dirtyPrompt?.name || !dirtyPrompt.name.trim()) {
      setNameError('Name is required.');
      return;
    }
    setNameError(null);
    setSaveError(null);
    createPrompt({
      name: dirtyPrompt.name,
      messages: [{ role: 'system', content: dirtyPrompt.template || '' }],
      // eslint-disable-next-line camelcase -- MLflow API uses snake_case
      commit_message: dirtyPrompt.commit_message,
      // eslint-disable-next-line camelcase -- MLflow API uses snake_case
      create_only: !isEditMode,
    });
  };

  function handleChange(field: string, value: string) {
    if (!dirtyPrompt) {
      return;
    }
    if (field === 'name' && nameError) {
      setNameError(null);
    }
    setDirtyPrompt({
      ...dirtyPrompt,
      [field]: value,
    });
  }

  return (
    <Flex direction={{ default: 'column' }}>
      <FlexItem spacer={{ default: 'spacerMd' }}>
        <Split hasGutter>
          <SplitItem isFilled>
            <Title headingLevel="h6" style={{ paddingBottom: 'var(--pf-t--global--spacer--xs)' }}>
              Name
            </Title>
            <TextInput
              value={dirtyPrompt?.name}
              isDisabled={isEditMode}
              onChange={(_event, value) => handleChange('name', value)}
              validated={nameError ? 'error' : 'default'}
            />
            {nameError && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                    {nameError}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </SplitItem>
          {isEditMode && (
            <SplitItem>
              <Title headingLevel="h6" style={{ paddingBottom: 'var(--pf-t--global--spacer--xs)' }}>
                Version
              </Title>
              <TextInput
                value={isLoadingVersion ? '...' : (nextVersion?.toString() ?? '—')}
                isDisabled
                style={{ width: '80px' }}
              />
            </SplitItem>
          )}
        </Split>
      </FlexItem>
      <FlexItem spacer={{ default: 'spacerMd' }}>
        <Title headingLevel="h6" style={{ paddingBottom: 'var(--pf-t--global--spacer--xs)' }}>
          Prompt
        </Title>
        <MenuToggle isDisabled style={{ marginBottom: 'var(--pf-t--global--spacer--xs)' }}>
          System
        </MenuToggle>
        <TextArea
          value={dirtyPrompt?.template}
          resizeOrientation="vertical"
          rows={12}
          onChange={(_event, value) => handleChange('template', value)}
        />
      </FlexItem>
      <FlexItem spacer={{ default: 'spacerMd' }}>
        <Title headingLevel="h6" style={{ paddingBottom: 'var(--pf-t--global--spacer--xs)' }}>
          Commit message
        </Title>
        <TextInput
          value={dirtyPrompt?.commit_message}
          onChange={(_event, value) => handleChange('commit_message', value)}
          placeholder="Describe your changes"
        />
      </FlexItem>
      {saveError && (
        <FlexItem>
          <Alert variant="danger" isInline title="Failed to save prompt">
            {saveError}
          </Alert>
        </FlexItem>
      )}
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        style={{ width: '100%', paddingTop: 'var(--pf-t--global--spacer--md)' }}
      >
        <Flex rowGap={{ default: 'rowGapXs' }}>
          <Button variant="primary" onClick={handleSave} isLoading={isCreating}>
            {isEditMode ? 'Save' : 'Create'}
          </Button>
          <Button variant="link" onClick={onClose} isDisabled={isCreating}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
