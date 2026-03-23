import React from 'react';
import { Flex, FlexItem, Button, TextInput, TextArea, Title } from '@patternfly/react-core';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { useCreatePrompt } from './usePromptQueries';

export default function CreatePrompt({ onClose }: { onClose: () => void }): React.ReactNode {
  const { dirtyPrompt, setActivePrompt, setDirtyPrompt } = usePlaygroundStore();

  const { createPrompt, isCreating } = useCreatePrompt({
    onSuccess: (newPrompt) => {
      setActivePrompt(newPrompt);
      onClose();
    },
  });

  const handleSave = () => {
    if (!dirtyPrompt?.name) {
      return;
    }
    createPrompt({
      name: dirtyPrompt.name,
      messages: [{ role: 'system', content: dirtyPrompt.template || '' }],
      // eslint-disable-next-line camelcase -- MLflow API uses snake_case
      commit_message: dirtyPrompt.commit_message,
    });
  };

  function handleChange(field: string, value: string) {
    if (!dirtyPrompt) {
      return;
    }
    setDirtyPrompt({
      ...dirtyPrompt,
      [field]: value,
    });
  }

  return (
    <Flex direction={{ default: 'column' }}>
      <FlexItem spacer={{ default: 'spacerMd' }}>
        <Title headingLevel="h6" style={{ paddingBottom: 'var(--pf-t--global--spacer--xs)' }}>
          Name
        </Title>
        <TextInput
          value={dirtyPrompt?.name}
          onChange={(_event, value) => handleChange('name', value)}
        />
      </FlexItem>
      <FlexItem spacer={{ default: 'spacerMd' }}>
        <Title headingLevel="h6" style={{ paddingBottom: 'var(--pf-t--global--spacer--xs)' }}>
          Prompt
        </Title>
        <TextArea
          value={dirtyPrompt?.template}
          resizeOrientation="vertical"
          rows={12}
          onChange={(_event, value) => handleChange('template', value)}
        />
      </FlexItem>
      <FlexItem spacer={{ default: 'spacerMd' }}>
        <Title headingLevel="h6" style={{ paddingBottom: 'var(--pf-t--global--spacer--xs)' }}>
          Commit Message
        </Title>
        <TextInput
          value={dirtyPrompt?.commit_message}
          onChange={(_event, value) => handleChange('commit_message', value)}
        />
      </FlexItem>
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        style={{ width: '100%', paddingTop: 'var(--pf-t--global--spacer--md)' }}
      >
        <Flex rowGap={{ default: 'rowGapXs' }}>
          <Button variant="primary" onClick={handleSave} isLoading={isCreating}>
            Save
          </Button>
          <Button variant="link" onClick={onClose} isDisabled={isCreating}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
