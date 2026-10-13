import * as React from 'react';
import {
  Button,
  Flex,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  Panel,
  TextArea,
  Stack,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import SafeNavigationBlocker from '~/app/components/SafeNavigationBlocker';
import { useSafeBrowserUnloadBlocker } from '~/app/hooks/useSafeBrowserUnloadBlocker';
import {
  useChatbotConfigStore,
  selectActivePrompt,
  selectDirtyPrompt,
  selectVariableValues,
  DEFAULT_CONFIG_ID,
} from '~/app/Chatbot/store';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';
import { MLflowPromptVersion } from '~/app/types';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '~/app/Chatbot/const';
import { useConfirmation } from '~/app/Chatbot/hooks/useConfirmation';
import { usePromptEdited } from '~/app/Chatbot/hooks/usePromptEdited';
import PromptVariableInputPanel from '~/app/Chatbot/components/PromptVariableInputPanel';
import PromptVersionSelector from '~/app/Chatbot/components/PromptVersionSelector';
import { GenAiContext } from '~/app/context/GenAiContext';

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
const VERSION_SWITCH_CONFIRMATION_CONFIG = {
  title: 'Switch to a different version?',
  message:
    'Your current prompt has unsaved changes that will be lost. To keep your changes, cancel and save first.',
  confirmLabel: 'Switch',
};
export default function PromptAssistantFormGroup({
  configId = DEFAULT_CONFIG_ID,
  systemInstruction,
  onSystemInstructionChange,
}: PromptAssistantFormGroupProps): React.ReactNode {
  const { openModal } = usePlaygroundStore();
  const { namespace } = React.useContext(GenAiContext);
  const activePrompt = useChatbotConfigStore(selectActivePrompt(configId));
  const dirtyPrompt = useChatbotConfigStore(selectDirtyPrompt(configId));
  const updateActivePrompt = useChatbotConfigStore((state) => state.updateActivePrompt);
  const updateDirtyPrompt = useChatbotConfigStore((state) => state.updateDirtyPrompt);
  const resetDirtyPrompt = useChatbotConfigStore((state) => state.resetDirtyPrompt);
  const variableValues = useChatbotConfigStore(selectVariableValues(configId));
  const updateVariableValues = useChatbotConfigStore((state) => state.updateVariableValues);
  const [isTextAreaFocused, setIsTextAreaFocused] = React.useState(false);
  const activeTemplate =
    activePrompt?.template ??
    activePrompt?.messages?.find((m) => m.role === 'system')?.content ??
    '';
  const isEdited = usePromptEdited(configId);

  useSafeBrowserUnloadBlocker(isEdited);
  const { confirm, modal: confirmationModal } = useConfirmation(isEdited);

  function handleTextChange(value: string) {
    onSystemInstructionChange(value);
    if (dirtyPrompt) {
      updateDirtyPrompt(configId, { ...dirtyPrompt, template: value });
    }
  }

  function handleRevert() {
    resetDirtyPrompt(configId);
    onSystemInstructionChange(activeTemplate || DEFAULT_SYSTEM_INSTRUCTIONS);
  }

  function handleVersionSwitch(version: MLflowPromptVersion) {
    const doSwitch = () => {
      updateActivePrompt(configId, version);
      const instruction =
        version.template ?? version.messages?.find((m) => m.role === 'system')?.content ?? '';
      onSystemInstructionChange(instruction);
      fireMiscTrackingEvent('Playground Prompt Version Switched', {
        fromVersion: activePrompt?.version,
        toVersion: version.version,
      });
    };

    confirm(doSwitch, {
      ...VERSION_SWITCH_CONFIRMATION_CONFIG,
      onConfirmTracking: () =>
        fireMiscTrackingEvent('Playground Prompt Version Switch Interrupted', {
          outcome: 'submit',
        }),
      onCancelTracking: () =>
        fireMiscTrackingEvent('Playground Prompt Version Switch Interrupted', {
          outcome: 'cancel',
        }),
    });
  }

  const isGlobalPrompt = activePrompt?.scope?.type === 'global';

  function handleSaveClicked() {
    const newPrompt: MLflowPromptVersion = dirtyPrompt
      ? { ...dirtyPrompt, template: systemInstruction }
      : { ...buildPromptStub(), template: systemInstruction };
    const mode = activePrompt ? 'edit' : 'create';
    // eslint-disable-next-line camelcase -- MLflow API uses snake_case
    newPrompt.commit_message = '';
    updateDirtyPrompt(configId, newPrompt);
    openModal(mode, configId, newPrompt);
  }

  function handleSaveAsClicked() {
    const newPrompt: MLflowPromptVersion = dirtyPrompt
      ? { ...dirtyPrompt, template: systemInstruction }
      : { ...buildPromptStub(), template: systemInstruction };
    // eslint-disable-next-line camelcase -- MLflow API uses snake_case
    newPrompt.commit_message = '';
    newPrompt.name = `copy-of-${newPrompt.name || activePrompt?.name || ''}`.trim();
    updateDirtyPrompt(configId, newPrompt);
    openModal('save-as', configId, newPrompt);
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
      <Panel>
        <Stack hasGutter>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <Flex gap={{ default: 'gapSm' }}>
              {activePrompt?.scope && (
                <Label
                  data-testid="prompt-scope-label"
                  isCompact
                  color={activePrompt.scope.type === 'project' ? 'blue' : 'orange'}
                >
                  {activePrompt.scope.type === 'project' ? 'Project' : 'Global'}
                </Label>
              )}
              {!!activePrompt?.version && (
                <PromptVersionSelector
                  promptName={activePrompt.name}
                  promptScope={activePrompt.scope}
                  currentVersion={activePrompt.version}
                  onVersionSelect={handleVersionSwitch}
                  namespace={namespace?.name}
                />
              )}
              {isEdited && (
                <div
                  data-testid="prompt-unsaved-indicator"
                  className={`${text.textColorPlaceholder} pf-v6-u-font-size-sm`}
                >
                  <i>Unsaved</i>
                </div>
              )}
              {activePrompt && (
                <Button
                  data-testid="prompt-revert-button"
                  variant="plain"
                  isDanger
                  className={isEdited ? 'pf-v6-u-text-color-status-danger' : undefined}
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
              )}
            </Flex>
            <Button
              data-testid="prompt-save-to-registry-button"
              variant={isEdited ? 'link' : 'plain'}
              isDisabled={!isEdited}
              onClick={isGlobalPrompt ? handleSaveAsClicked : handleSaveClicked}
            >
              Add to prompt registry
            </Button>
          </Flex>
          <TextArea
            id="system-instructions-input"
            type="text"
            value={systemInstruction}
            autoResize={isTextAreaFocused || !!activePrompt}
            resizeOrientation="vertical"
            onFocus={() => setIsTextAreaFocused(true)}
            onChange={(_event, value) => handleTextChange(value)}
            aria-label="Prompt instructions input"
            rows={2}
            data-testid="system-instructions-input"
          />
          <FormHelperText className="pf-v6-u-mt-xs">
            <HelperText>
              <HelperTextItem>
                Wrap variables with double curly braces, e.g. {'{{ name }}'}. Variable slots appear
                below the instructions when placeholders are detected.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          <PromptVariableInputPanel
            systemInstruction={systemInstruction}
            variableValues={variableValues}
            onVariableValuesChange={(values) => updateVariableValues(configId, values)}
          />
        </Stack>
      </Panel>
    </>
  );
}
