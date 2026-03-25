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
  const {
    activePrompt,
    dirtyPrompt,
    setActivePrompt,
    setDirtyPrompt,
    resetDirtyPrompt,
    openModal,
  } = usePlaygroundStore();
  const [editMode, setEditMode] = React.useState(true);
  const activeTemplate =
    activePrompt?.template ??
    activePrompt?.messages?.find((m) => m.role === 'system')?.content ??
    '';
  const isEdited = systemInstruction !== activeTemplate;

  React.useEffect(() => {
    setEditMode(!activePrompt);
  }, [activePrompt]);

  function handleTextChange(value: string) {
    onSystemInstructionChange(value);
    if (dirtyPrompt) {
      setDirtyPrompt({ ...dirtyPrompt, template: value });
    }
  }

  function handleRevert() {
    resetDirtyPrompt();
    onSystemInstructionChange(activeTemplate || DEFAULT_SYSTEM_INSTRUCTIONS);
    setEditMode(false);
  }

  function handleNewPrompt() {
    const promptStub = { ...buildPromptStub(), template: DEFAULT_SYSTEM_INSTRUCTIONS };
    setActivePrompt(null);
    setDirtyPrompt(promptStub);
    onSystemInstructionChange(promptStub.template);
    setEditMode(true);
  }

  function handleSaveClicked() {
    setEditMode(false);
    const newPrompt: MLflowPromptVersion = dirtyPrompt
      ? { ...dirtyPrompt, template: systemInstruction }
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
          <Title headingLevel="h6">{get(dirtyPrompt, 'name', 'New Prompt')}</Title>
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
          id="system-instructions-input"
          type="text"
          value={systemInstruction}
          readOnly={!editMode}
          onChange={(_event, value) => handleTextChange(value)}
          aria-label="Prompt instructions input"
          rows={12}
          data-testid="system-instructions-input"
        />
        {!editMode && (
          <Flex>
            <Button variant="primary" isDisabled={editMode} onClick={() => setEditMode(!editMode)}>
              Edit
            </Button>
            <Button variant="link" onClick={handleNewPrompt}>
              Reset
            </Button>
          </Flex>
        )}
        {editMode && (
          <Flex>
            <Button variant="primary" isDisabled={!isEdited} onClick={handleSaveClicked}>
              Save
            </Button>
            <Button variant="link" isDisabled={!activePrompt} onClick={handleRevert}>
              Revert
            </Button>
          </Flex>
        )}
      </Stack>
    </Panel>
  );
}
