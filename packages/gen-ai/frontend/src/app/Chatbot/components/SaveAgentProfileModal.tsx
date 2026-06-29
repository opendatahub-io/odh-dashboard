import * as React from 'react';
import {
  Alert,
  Button,
  Divider,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useFetchAAEVectorStores from '~/app/hooks/useFetchAAEVectorStores';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import { DEFAULT_CONFIG_ID, useChatbotConfigStore } from '~/app/Chatbot/store';
import { convertMaaSModelToAIModel, isPlaygroundModelMatchForAIModel } from '~/app/utilities/utils';
import { serializeToAgentProfileSpec } from '~/app/agentProfile/serialize';
import { usePromptEdited } from '~/app/Chatbot/hooks/usePromptEdited';
import { MCPServerFromAPI } from '~/app/types/mcp';

/** Fallback ConfigMap name used only when the BFF does not return one. */
const MCP_CONFIG_MAP_NAME_FALLBACK = 'gen-ai-aa-mcp-servers';

type SaveAgentProfileModalProps = {
  /** 'save-as' calls POST (new profile); 'save' calls PUT (overwrite loaded profile). */
  mode: 'save-as' | 'save';
  mcpServers: MCPServerFromAPI[];
  /** ConfigMap name from the BFF response (config_map_info.name). Falls back to a default when null. */
  mcpConfigMapName: string | null;
  onClose: () => void;
  /** Called after a successful save with the resulting profileId, displayName, and description. */
  onSaved: (profileId: string, displayName: string, description: string) => void;
};

const SaveAgentProfileModal: React.FC<SaveAgentProfileModalProps> = ({
  mode,
  mcpServers,
  mcpConfigMapName,
  onClose,
  onSaved,
}) => {
  const { api, apiAvailable } = useGenAiAPI();
  const { aiModels, maasModels, models: playgroundModels } = React.useContext(ChatbotContext);
  const { namespace } = React.useContext(GenAiContext);

  const config = useChatbotConfigStore((s) => s.configurations[DEFAULT_CONFIG_ID]);
  const loadedProfileId = useChatbotConfigStore((s) => s.loadedProfileId);
  const loadedProfileDisplayName = useChatbotConfigStore((s) => s.loadedProfileDisplayName);
  const loadedResourceVersion = useChatbotConfigStore((s) => s.loadedResourceVersion);
  const loadedProfileDescription = useChatbotConfigStore((s) => s.loadedProfileDescription);

  const { data: externalVectorStores = [] } = useFetchAAEVectorStores();

  const [name, setName] = React.useState(mode === 'save' ? (loadedProfileDisplayName ?? '') : '');
  const [nameTouched, setNameTouched] = React.useState(false);
  const [description, setDescription] = React.useState(
    mode === 'save' ? (loadedProfileDescription ?? '') : '',
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conflictError, setConflictError] = React.useState<'modified' | 'deleted' | null>(null);

  const llamaModel = React.useMemo(
    () => playgroundModels.find((m) => m.id === config?.selectedModel),
    [playgroundModels, config?.selectedModel],
  );
  const allAIModels = React.useMemo(
    () => [...aiModels, ...maasModels.map(convertMaaSModelToAIModel)],
    [aiModels, maasModels],
  );
  const aiModel = React.useMemo(
    () =>
      llamaModel
        ? allAIModels.find((ai) => isPlaygroundModelMatchForAIModel(llamaModel, ai))
        : undefined,
    [llamaModel, allAIModels],
  );
  const asrModel = React.useMemo(
    () =>
      config?.isAsrModelEnabled && config.selectedAsrModel
        ? aiModels.find((ai) => ai.model_id === config.selectedAsrModel)
        : undefined,
    [config?.isAsrModelEnabled, config?.selectedAsrModel, aiModels],
  );

  const externalVectorStoreName = React.useMemo(() => {
    if (
      config?.isRagEnabled &&
      config.knowledgeMode === 'external' &&
      config.selectedVectorStoreId
    ) {
      const store = externalVectorStores.find(
        (s) => s.vector_store_id === config.selectedVectorStoreId,
      );
      return store?.vector_store_name ?? config.selectedVectorStoreId;
    }
    return null;
  }, [config, externalVectorStores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    if (!config || !apiAvailable || !name.trim()) {
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      // Register or update the prompt before serializing, then sync the store so
      // the spec picks up the new version via config.activePrompt.
      if (isPromptDirty || !activePrompt) {
        const promptName = activePrompt ? activePrompt.name : autoPromptName.current;
        // dirtyPrompt.template holds the latest edited text; systemInstruction is the fallback
        const template = dirtyPrompt?.template ?? systemInstruction ?? '';
        const registeredPrompt = await api.registerMLflowPrompt({
          name: promptName,
          template,
        });
        // The API response may omit template; preserve what we sent so the store
        // doesn't reset the displayed instruction to an empty/old value.
        useChatbotConfigStore
          .getState()
          .updateActivePrompt(DEFAULT_CONFIG_ID, { ...registeredPrompt, template });
      }

      // Read fresh config after the store update so activePrompt reflects the new version
      const freshConfig =
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID] ?? config;

      const spec = serializeToAgentProfileSpec(
        freshConfig,
        name.trim(),
        description.trim() || undefined,
        {
          model: aiModel,
          asrModel,
          mcpServers,
          mcpConfigMapName: mcpConfigMapName ?? MCP_CONFIG_MAP_NAME_FALLBACK,
        },
      );

      if (mode === 'save-as' || !loadedProfileId) {
        const response = await api.createAgentProfile({ spec });
        onSaved(response.profileId, response.displayName, description.trim());
      } else {
        // Use the stored resourceVersion directly — no intermediate GET needed.
        // The server returns 409 if the profile was modified elsewhere, or 404 if deleted.
        const response = await api.updateAgentProfile({
          id: loadedProfileId,
          spec,
          resourceVersion: loadedResourceVersion ?? '',
        });
        onSaved(loadedProfileId, response.displayName, description.trim());
        // Set after onSaved: applyAgentProfile (called inside onSaved) resets the store
        // from storeInitialState, which would clear anything set before it.
        useChatbotConfigStore.getState().setLoadedResourceVersion(response.resourceVersion);
      }
      // Update the dirty-detection baseline to the spec that was just persisted.
      // Any subsequent config changes will now be detected as unsaved.
      useChatbotConfigStore.getState().setLoadedProfileSpec(spec);
      onClose();
    } catch (err) {
      if (err instanceof Error && 'code' in err) {
        if (err.code === 'conflict') {
          setConflictError('modified');
          setIsSaving(false);
          return;
        }
        if (err.code === 'not_found' || err.code === '404') {
          setConflictError('deleted');
          setIsSaving(false);
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsSaving(false);
    }
  };

  const title = mode === 'save' ? 'Save agent configuration' : 'Save as agent configuration';
  const nameError = nameTouched && !name.trim();
  const isSaveDisabled = isSaving || !name.trim();

  const activePrompt = config?.activePrompt;
  const dirtyPrompt = config?.dirtyPrompt;
  const systemInstruction = config?.systemInstruction;

  // usePromptEdited compares systemInstruction against the loaded prompt's template —
  // true only when the user has actually edited the content after loading.
  const isPromptDirty = usePromptEdited(DEFAULT_CONFIG_ID);
  const hasMcpServers = (config?.selectedMcpServerIds.length ?? 0) > 0;

  // Stable auto-generated prompt name for new/instruction-only prompts
  const autoPromptName = React.useRef(`agent-prompt-${Math.random().toString(36).slice(2, 6)}`);

  // Fetch next available version when a loaded prompt has unsaved edits
  const [nextPromptVersion, setNextPromptVersion] = React.useState<number | null>(null);
  const fetchedVersionRef = React.useRef(false);
  React.useEffect(() => {
    if (fetchedVersionRef.current || !isPromptDirty || !apiAvailable) {
      return;
    }
    fetchedVersionRef.current = true;
    api
      .listMLflowPromptVersions({ name: activePrompt?.name ?? '' })
      .then((response) => {
        const versions = response.versions ?? [];
        const maxVersion =
          versions.length > 0
            ? Math.max(...versions.map((v) => v.version))
            : (activePrompt?.version ?? 0);
        setNextPromptVersion(maxVersion + 1);
      })
      .catch(() => {
        setNextPromptVersion((activePrompt?.version ?? 0) + 1);
      });
  }, [isPromptDirty, activePrompt, apiAvailable, api]);

  return (
    <Modal
      variant="medium"
      isOpen
      onClose={onClose}
      aria-labelledby="save-agent-profile-modal-title"
      data-testid="save-agent-profile-modal"
    >
      <ModalHeader
        title={title}
        labelId="save-agent-profile-modal-title"
        description="Save your model, prompt, knowledge, and MCP servers as a reusable agent configuration."
      />
      <ModalBody>
        <Form id="save-agent-profile-form" onSubmit={handleSubmit}>
          <FormGroup label="Agent name" isRequired fieldId="save-agent-profile-name">
            <TextInput
              id="save-agent-profile-name"
              value={name}
              onChange={(_e, val) => setName(val)}
              onBlur={() => setNameTouched(true)}
              isRequired
              isDisabled={isSaving}
              placeholder='ie "Code_reviewer"'
              data-testid="save-agent-profile-name-input"
              validated={nameError ? 'error' : 'default'}
            />
            {nameError && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">Name is required.</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
          <FormGroup label="Description" fieldId="save-agent-profile-description">
            <TextArea
              id="save-agent-profile-description"
              value={description}
              onChange={(_e, val) => setDescription(val)}
              placeholder="Describe the use case for this agent"
              resizeOrientation="vertical"
              isDisabled={isSaving}
              rows={3}
              data-testid="save-agent-profile-description-input"
            />
          </FormGroup>
          {error && (
            <HelperText>
              <HelperTextItem variant="error">{error}</HelperTextItem>
            </HelperText>
          )}
          {conflictError && (
            <Alert
              variant="warning"
              isInline
              title={
                conflictError === 'deleted'
                  ? 'This agent configuration could not be found'
                  : 'This agent configuration was modified elsewhere'
              }
              data-testid="save-conflict-alert"
            >
              Your changes cannot be saved directly. Use Save As to create a new agent configuration
              with your changes.
            </Alert>
          )}
          <Divider />
          {/* Agent configuration details */}
          <Title headingLevel="h3" size="md">
            Agent configuration details
          </Title>
          {/* Models — inference only */}
          {(aiModel || llamaModel) && (
            <FormGroup label="Models" fieldId="detail-models">
              <LabelGroup>
                <Label variant="outline">
                  {aiModel?.model_name ?? llamaModel?.id}
                  <Label isCompact color="grey" className="pf-v6-u-ml-xs">
                    Inference
                  </Label>
                </Label>
              </LabelGroup>
            </FormGroup>
          )}
          {/* Prompt */}
          {(activePrompt || dirtyPrompt || systemInstruction?.trim()) && (
            <FormGroup label="Prompt" fieldId="detail-prompt">
              {/* Loaded prompt with unsaved edits — will save as next version */}
              {isPromptDirty && (
                <>
                  <Alert
                    variant="info"
                    isInline
                    isPlain
                    title="Unsaved changes will be automatically saved with this profile"
                  />
                  <LabelGroup>
                    <Label variant="outline">
                      {activePrompt?.name ?? ''}
                      <Label isCompact color="grey" className="pf-v6-u-ml-xs">
                        v{nextPromptVersion ?? '…'}
                      </Label>
                    </Label>
                  </LabelGroup>
                </>
              )}
              {/* Clean loaded prompt */}
              {activePrompt && !isPromptDirty && (
                <LabelGroup>
                  <Label variant="outline">
                    {activePrompt.name}
                    <Label isCompact color="grey" className="pf-v6-u-ml-xs">
                      v{activePrompt.version}
                    </Label>
                  </Label>
                </LabelGroup>
              )}
              {/* New unsaved prompt (dirtyPrompt without activePrompt) */}
              {!activePrompt && dirtyPrompt && !isPromptDirty && (
                <>
                  <Alert
                    variant="info"
                    isInline
                    isPlain
                    title="Unsaved prompts will be automatically saved with this profile"
                  />
                  <LabelGroup>
                    <Label variant="outline">
                      {autoPromptName.current}
                      <Label isCompact color="grey" className="pf-v6-u-ml-xs">
                        v1
                      </Label>
                    </Label>
                  </LabelGroup>
                </>
              )}
              {/* Raw system instruction — a new prompt will be auto-created */}
              {!activePrompt && !dirtyPrompt && systemInstruction?.trim() && (
                <>
                  <Alert
                    variant="info"
                    isInline
                    isPlain
                    title="A new prompt will be automatically created with this profile"
                  />
                  <LabelGroup>
                    <Label variant="outline">
                      {autoPromptName.current}
                      <Label isCompact color="grey" className="pf-v6-u-ml-xs">
                        v1
                      </Label>
                    </Label>
                  </LabelGroup>
                </>
              )}
            </FormGroup>
          )}

          {/* Knowledge */}
          <FormGroup label="Knowledge" fieldId="detail-knowledge">
            {!config?.isRagEnabled ? (
              <Alert variant="info" isInline isPlain title="RAG is not enabled" />
            ) : config.knowledgeMode === 'inline' ? (
              <LabelGroup>
                <Label variant="outline">
                  Uploaded documents
                  <Label isCompact color="orange" className="pf-v6-u-ml-xs">
                    Inline
                  </Label>
                </Label>
              </LabelGroup>
            ) : externalVectorStoreName ? (
              <LabelGroup>
                <Label variant="outline">{externalVectorStoreName}</Label>
              </LabelGroup>
            ) : (
              <Alert variant="info" isInline isPlain title="No knowledge source selected" />
            )}
          </FormGroup>

          {/* MCP Servers */}
          <FormGroup label="MCP servers" fieldId="detail-mcp">
            {hasMcpServers ? (
              <LabelGroup>
                {config?.selectedMcpServerIds.map((serverId) => {
                  const server = mcpServers.find((s) => s.url === serverId);
                  const nsSelections = config.mcpToolSelections[namespace?.name ?? ''];
                  const toolSelections = nsSelections?.[serverId];
                  const toolCount = toolSelections !== undefined ? toolSelections.length : null;
                  return (
                    <Label key={serverId} variant="outline">
                      {server?.name ?? serverId}
                      {toolCount !== null && (
                        <Label isCompact color="grey" className="pf-v6-u-ml-xs">
                          {toolCount} tool{toolCount !== 1 ? 's' : ''}
                        </Label>
                      )}
                    </Label>
                  );
                })}
              </LabelGroup>
            ) : (
              <Alert variant="info" isInline isPlain title="No MCP servers selected" />
            )}
          </FormGroup>

          {/* Guardrails — never saved */}
          <FormGroup label="Guardrails" fieldId="detail-guardrails">
            <Alert
              variant="info"
              isInline
              title="Playground guardrails will not be saved with this profile"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          form="save-agent-profile-form"
          type="submit"
          isLoading={isSaving}
          isDisabled={isSaveDisabled}
          data-testid="save-agent-profile-submit-button"
        >
          {mode === 'save' ? 'Save' : 'Save as'}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isSaving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default SaveAgentProfileModal;
