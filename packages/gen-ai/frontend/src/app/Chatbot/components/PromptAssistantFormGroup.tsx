import * as React from 'react';
import {
  Button,
  Flex,
  Label,
  Panel,
  Popover,
  TextArea,
  Stack,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import SafeNavigationBlocker from '~/app/components/SafeNavigationBlocker';
import { useSafeBrowserUnloadBlocker } from '~/app/hooks/useSafeBrowserUnloadBlocker';
import {
  useChatbotConfigStore,
  selectActivePrompt,
  selectDirtyPrompt,
  DEFAULT_CONFIG_ID,
} from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { MLflowPromptVersion } from '~/app/types';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';
import { useConfirmation } from '~/app/Chatbot/hooks/useConfirmation';
import { usePromptEdited } from '~/app/Chatbot/hooks/usePromptEdited';

type PromptAssistantFormGroupProps = {
  configId?: string;
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
};

const CONFIRMATION_CONFIG = {
  title: 'Revert to saved version?',
  message:
    'Your current edits haven’t been saved. Reverting will restore the last saved version of this prompt. To keep your changes, cancel and save first.',
  confirmLabel: 'Revert',
};
const RESET_CONFIRMATION_CONFIG = {
  title: 'Reset to default?',
  message:
    "Your current edits haven't been saved. Resetting will restore the default prompt instructions. To keep your changes, cancel and save first.",
  confirmLabel: 'Reset',
};

export default function PromptAssistantFormGroup({
  configId = DEFAULT_CONFIG_ID,
  systemInstruction,
  onSystemInstructionChange,
}: PromptAssistantFormGroupProps): React.ReactNode {
  const { openModal } = usePlaygroundStore();
  const activePrompt = useChatbotConfigStore(selectActivePrompt(configId));
  const dirtyPrompt = useChatbotConfigStore(selectDirtyPrompt(configId));
  const updateDirtyPrompt = useChatbotConfigStore((state) => state.updateDirtyPrompt);
  const resetDirtyPrompt = useChatbotConfigStore((state) => state.resetDirtyPrompt);
  const clearPromptState = useChatbotConfigStore((state) => state.clearPromptState);
  const [editMode, setEditMode] = React.useState(true);
  const activeTemplate =
    activePrompt?.template ??
    activePrompt?.messages?.find((m) => m.role === 'system')?.content ??
    '';
  const isEdited = usePromptEdited(configId);

  useSafeBrowserUnloadBlocker(isEdited);
  const { confirm, modal: confirmationModal } = useConfirmation(isEdited);

  React.useEffect(() => {
    setEditMode(!activePrompt);
  }, [activePrompt]);

  function handleTextChange(value: string) {
    onSystemInstructionChange(value);
    if (dirtyPrompt) {
      updateDirtyPrompt(configId, { ...dirtyPrompt, template: value });
    }
  }

  function handleRevert() {
    resetDirtyPrompt(configId);
    onSystemInstructionChange(activeTemplate || DEFAULT_SYSTEM_INSTRUCTIONS);
    setEditMode(false);
  }

  function handleNewPrompt() {
    const promptStub = { ...buildPromptStub(), template: DEFAULT_SYSTEM_INSTRUCTIONS };
    clearPromptState(configId, promptStub);
    onSystemInstructionChange(promptStub.template);
    setEditMode(true);
  }

  function handleSaveClicked() {
    setEditMode(false);
    const newPrompt: MLflowPromptVersion = dirtyPrompt
      ? { ...dirtyPrompt, template: systemInstruction }
      : { ...buildPromptStub(), template: systemInstruction };
    const mode = activePrompt ? 'edit' : 'create';
    // eslint-disable-next-line camelcase -- MLflow API uses snake_case
    newPrompt.commit_message = '';
    updateDirtyPrompt(configId, newPrompt);
    openModal(mode, configId, newPrompt);
  }

  function buildPromptStub(): MLflowPromptVersion {
    const now = new Date();
    /* eslint-disable camelcase */
    return {
      name: '',
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
    <>
      <SafeNavigationBlocker hasUnsavedChanges={isEdited} />
      {confirmationModal}
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
            <Title headingLevel="h6">{dirtyPrompt?.name || 'New Prompt'}</Title>
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
          <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
            <span>Instructions</span>
            <Popover
              headerContent="System instructions"
              bodyContent="The instructions field is used as a system instruction when chatting with the model in the playground. It guides the model's behavior and response style."
            >
              <OutlinedQuestionCircleIcon className="pf-v6-u-color-200" />
            </Popover>
          </Flex>
          <TextArea
            className={!editMode ? 'pf-m-readonly' : undefined}
            id="system-instructions-input"
            type="text"
            value={systemInstruction}
            readOnly={!editMode}
            resizeOrientation="vertical"
            onChange={(_event, value) => handleTextChange(value)}
            aria-label="Prompt instructions input"
            rows={18}
            data-testid="system-instructions-input"
          />
          {!editMode && (
            <Flex>
              <Button
                variant="primary"
                onClick={() => {
                  setEditMode(true);
                  fireMiscTrackingEvent('Playground Prompt Edit Selected', {
                    source: 'button',
                  });
                }}
              >
                Edit
              </Button>
              <Button
                variant="link"
                isDisabled={!isEdited && !activePrompt}
                onClick={() =>
                  confirm(handleNewPrompt, {
                    ...RESET_CONFIRMATION_CONFIG,
                    onConfirmTracking: () =>
                      fireMiscTrackingEvent('Playground Prompt Cleared', {
                        outcome: 'submit',
                        hadLoadedPrompt: !!activePrompt,
                      }),
                    onCancelTracking: () =>
                      fireMiscTrackingEvent('Playground Prompt Cleared', {
                        outcome: 'cancel',
                        hadLoadedPrompt: !!activePrompt,
                      }),
                  })
                }
              >
                Reset
              </Button>
            </Flex>
          )}
          {editMode && (
            <Flex>
              <Button variant="primary" isDisabled={!isEdited} onClick={handleSaveClicked}>
                Save
              </Button>
              {activePrompt ? (
                <Button
                  variant="link"
                  isDisabled={!isEdited}
                  onClick={() =>
                    confirm(handleRevert, {
                      ...CONFIRMATION_CONFIG,
                      onConfirmTracking: () =>
                        fireMiscTrackingEvent('Playground Prompt Reverted', {
                          outcome: 'submit',
                        }),
                      onCancelTracking: () =>
                        fireMiscTrackingEvent('Playground Prompt Reverted', {
                          outcome: 'cancel',
                        }),
                    })
                  }
                >
                  Revert
                </Button>
              ) : (
                <Button
                  variant="link"
                  isDisabled={!isEdited}
                  onClick={() =>
                    confirm(handleNewPrompt, {
                      ...RESET_CONFIRMATION_CONFIG,
                      forceConfirm: true,
                      onConfirmTracking: () =>
                        fireMiscTrackingEvent('Playground Prompt Cleared', {
                          outcome: 'submit',
                          hadLoadedPrompt: false,
                        }),
                      onCancelTracking: () =>
                        fireMiscTrackingEvent('Playground Prompt Cleared', {
                          outcome: 'cancel',
                          hadLoadedPrompt: false,
                        }),
                    })
                  }
                >
                  Reset
                </Button>
              )}
            </Flex>
          )}
        </Stack>
      </Panel>
    </>
  );
}
