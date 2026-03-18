import * as React from 'react';
import { get } from 'lodash';
import { Button, Flex, Label, Panel, TextArea, Stack, Title } from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { MLflowPromptVersion } from '~/app/types';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';

type PromptAssistantFormGroupProps = {
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
};

export default function PromptAssistantFormGroup({
  systemInstruction,
  onSystemInstructionChange,
}: PromptAssistantFormGroupProps): React.ReactNode {
  const [editMode, setEditMode] = React.useState(false);
  const { activePrompt, setActivePrompt, openModal } = usePlaygroundStore();
  const purePrompt =
    activePrompt?.template ??
    activePrompt?.messages?.find((m) => m.role === 'system')?.content ??
    '';
  const isEdited = systemInstruction !== purePrompt;
  function handleRevert() {
    onSystemInstructionChange(purePrompt || DEFAULT_SYSTEM_INSTRUCTIONS);
    setEditMode(false);
  }

  function handleNewPrompt() {
    const promptStub = { ...buildPromptStub(), template: 'You are a helpful AI assistant.' };
    setActivePrompt(promptStub);
    onSystemInstructionChange(promptStub.template);
    setEditMode(true);
  }

  function handleSaveClicked() {
    const newPrompt: MLflowPromptVersion = activePrompt
      ? { ...activePrompt, template: systemInstruction }
      : { ...buildPromptStub(), template: systemInstruction };
    openModal('create', newPrompt);
  }

  function buildPromptStub(): MLflowPromptVersion {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const month = now.toLocaleString('en', { month: 'short' });
    const date = [month, pad(now.getDate()), now.getFullYear()].join('.');
    const time = [pad(now.getHours()), pad(now.getMinutes())].join('.');
    const name = `${date}_${time}`;
    /* eslint-disable camelcase */
    return {
      name,
      version: 0,
      template: '',
      commit_message: '',
      tags: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    /* eslint-enable camelcase */
  }

  return (
    <Panel
      style={{
        borderStyle: 'dashed',
        borderWidth: 1,
        borderRadius: 6,
        borderColor: 'var(--pf-t--global--border--color--default)',
      }}
    >
      <Stack
        hasGutter
        style={{
          padding: 'var(--pf-t--global--spacer--md)',
          paddingTop: 'var(--pf-t--global--spacer--lg)',
        }}
      >
        <Flex>
          <Title headingLevel="h6">{get(activePrompt, 'name', 'New Prompt')}</Title>
          {!!activePrompt?.version && (
            <Label
              isCompact
              variant={isEdited ? 'filled' : 'outline'}
              color={isEdited ? 'grey' : 'purple'}
            >
              Version {activePrompt.version.toString()}
            </Label>
          )}
          {isEdited && (
            <div className={`${text.textColorPlaceholder} pf-v6-u-font-size-sm`}>Unsaved</div>
          )}
        </Flex>
        <TextArea
          className={!editMode ? 'pf-m-readonly' : undefined}
          style={{ cursor: editMode ? 'text' : 'pointer' }}
          id="system-instructions-input"
          type="text"
          value={systemInstruction}
          readOnly={!editMode}
          onDoubleClick={() => setEditMode(true)}
          onChange={(_event, value) => onSystemInstructionChange(value)}
          onBlur={() => setEditMode(false)}
          aria-label="Prompt instructions input"
          rows={12}
          data-testid="prompt-instructions-input"
        />
        {!isEdited && (
          <Flex>
            <Button variant="primary" isDisabled={editMode} onClick={() => setEditMode(!editMode)}>
              Edit
            </Button>
            <Button variant="link" onClick={handleNewPrompt}>
              Reset
            </Button>
          </Flex>
        )}
        {isEdited && (
          <Flex>
            <Button variant="primary" onClick={handleSaveClicked}>
              Save
            </Button>
            <Button variant="link" onClick={handleRevert}>
              Revert
            </Button>
          </Flex>
        )}
      </Stack>
    </Panel>
  );
}
