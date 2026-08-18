import React from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import type { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { useThemeContext } from '@odh-dashboard/ui-core';
import { useNotification } from '~/odh/hooks/useNotification';
import McpServerIconsField, {
  type McpServerIconsFieldStatus,
} from '~/odh/components/McpServerIconsField';
import McpServerTagsField from '~/odh/components/McpServerTagsField';
import ProjectSelectorFieldWrapper from '~/odh/components/ProjectSelectorFieldWrapper';
import { useMcpServerToolList } from '~/app/hooks/useMcpServerCatalog';
import type { McpDeploySpec, McpServer, McpServerJson } from '~/app/types/mcpCatalogTypes';
import { WORKSPACE_PARAM } from '~/app/utilities/const';
import { REGISTER_TOOLS_LOAD_WARNING } from '~/odh/const';
import { McpRegisterStatus, type MCPIcon, type MCPTagEntry } from '~/odh/types/mcpRegistryTypes';
import {
  canSubmitMcpServerJson,
  catalogToRegistryIcons,
  catalogToRegistryTags,
  getMcpServerJsonSubmitError,
  hasBlockingTag,
  isMcpServerJson,
  mcpServerDetailRoute,
  notifyRegisterMcpServerResult,
  registerMcpServer,
  withDeploySpecMeta,
} from '~/odh/utils';

const STATUS_OPTIONS: SimpleSelectOption[] = [
  { key: McpRegisterStatus.DRAFT, label: 'Draft' },
  { key: McpRegisterStatus.ACTIVE, label: 'Active' },
];

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

const parseServerJson = (content: string): McpServerJson | undefined => {
  try {
    const parsed: unknown = JSON.parse(content);
    return isMcpServerJson(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

type McpRegisterModalProps = {
  server: McpServer;
  registriesNamespace: string;
  deploySpec?: McpDeploySpec;
  onClose: (saved?: boolean) => void;
};

const McpRegisterModal: React.FC<McpRegisterModalProps> = ({
  server,
  registriesNamespace,
  deploySpec,
  onClose,
}) => {
  const notification = useNotification();
  const { theme } = useThemeContext();
  const navigate = useNavigate();

  const [serverJsonContent, setServerJsonContent] = React.useState(() =>
    JSON.stringify(withDeploySpecMeta(server, deploySpec), null, 2),
  );
  const [selectedNamespace, setSelectedNamespace] = React.useState('');
  const [displayNameValue, setDisplayNameValue] = React.useState(
    () => server.displayName || server.name,
  );
  const [status, setStatus] = React.useState<McpRegisterStatus>(McpRegisterStatus.DRAFT);
  const [sourceValue, setSourceValue] = React.useState(
    () => server.repositoryUrl || server.sourceCode || '',
  );
  const officialIcons = React.useMemo(
    () => catalogToRegistryIcons(server, registriesNamespace),
    [server, registriesNamespace],
  );
  const [icons, setIcons] = React.useState<MCPIcon[]>([]);
  const [iconStatus, setIconStatus] = React.useState<McpServerIconsFieldStatus>({
    settled: false,
    hasBlockingError: false,
    iconsForPayload: [],
  });
  const handleIconStatusChange = React.useCallback((nextStatus: McpServerIconsFieldStatus) => {
    setIconStatus((prev) =>
      prev.settled === nextStatus.settled &&
      prev.hasBlockingError === nextStatus.hasBlockingError &&
      prev.iconsForPayload.length === nextStatus.iconsForPayload.length &&
      prev.iconsForPayload.every(
        (icon, i) =>
          icon.src === nextStatus.iconsForPayload[i].src &&
          icon.theme === nextStatus.iconsForPayload[i].theme,
      )
        ? prev
        : nextStatus,
    );
  }, []);
  const [tags, setTags] = React.useState<MCPTagEntry[]>(() => {
    const catalogTags = catalogToRegistryTags(server);
    return catalogTags.length > 0 ? catalogTags : [{ key: '', value: '' }];
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();
  const [showServerJsonError, setShowServerJsonError] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController>();

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const [toolList, toolsLoaded, toolsLoadError] = useMcpServerToolList(
    server.id,
    registriesNamespace,
  );
  const catalogTools = (toolList.items ?? []).map((item) => item.tool);

  const parsedServerJson = parseServerJson(serverJsonContent);
  const serverJsonSubmitError = getMcpServerJsonSubmitError(serverJsonContent);

  const handleServerJsonChange = React.useCallback((value: string) => {
    setServerJsonContent(value);
    setShowServerJsonError(false);
  }, []);

  const handleServerJsonBlur = React.useCallback(() => {
    setShowServerJsonError(true);
  }, []);

  const isRegisterDisabled =
    !selectedNamespace ||
    !canSubmitMcpServerJson(parsedServerJson) ||
    !iconStatus.settled ||
    iconStatus.hasBlockingError ||
    hasBlockingTag(tags) ||
    isSubmitting ||
    (!toolsLoaded && !toolsLoadError);

  const handleRegister = async () => {
    if (!canSubmitMcpServerJson(parsedServerJson) || hasBlockingTag(tags)) {
      return;
    }
    const targetName = parsedServerJson.name;

    setIsSubmitting(true);
    setSubmitError(undefined);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await registerMcpServer(
        {
          tools: catalogTools,
          registryName: targetName,
          serverJson: parsedServerJson,
          displayName: displayNameValue,
          status,
          source: sourceValue || undefined,
          icons: iconStatus.iconsForPayload,
          tags,
        },
        {
          queryParams: { [WORKSPACE_PARAM]: selectedNamespace },
          opts: { signal: controller.signal },
        },
      );
      notifyRegisterMcpServerResult(notification, targetName, result);
      onClose(true);
      navigate(mcpServerDetailRoute(targetName, selectedNamespace));
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) {
        return;
      }
      setSubmitError(e instanceof Error ? e : new Error('Failed to register MCP server'));
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal isOpen variant="medium" onClose={() => onClose()} data-testid="mcp-register-modal">
      <ModalHeader title="Register MCP server" data-testid="mcp-register-modal-title" />
      <ModalBody>
        <Form>
          {toolsLoadError && (
            <Alert
              isInline
              variant="warning"
              title={REGISTER_TOOLS_LOAD_WARNING.TITLE}
              data-testid="mcp-register-tools-warning"
            >
              {REGISTER_TOOLS_LOAD_WARNING.description(toolsLoadError.message)}
            </Alert>
          )}
          <FormGroup
            label="Project"
            fieldId="project-select"
            isRequired
            data-testid="namespace-form-group"
            labelHelp={
              <FieldGroupHelpLabelIcon content="Registers this MCP server in the selected OpenShift project." />
            }
          >
            <ProjectSelectorFieldWrapper
              namespace={selectedNamespace}
              onSelection={setSelectedNamespace}
              placeholder="Select a project"
              isFullWidth
              appendTo={() => document.body}
            />
          </FormGroup>

          <FormGroup
            label="Display name"
            fieldId="mcp-register-display-name"
            labelHelp={
              <FieldGroupHelpLabelIcon content="Optional. Shown as the human-readable label for this registration. Registry placement is controlled by the name in server.json." />
            }
          >
            <TextInput
              id="mcp-register-display-name"
              value={displayNameValue}
              placeholder="Human-readable label for this registration"
              onChange={(_event, value) => setDisplayNameValue(value)}
              data-testid="mcp-register-display-name"
            />
          </FormGroup>

          <FormGroup
            label="server.json"
            isRequired
            fieldId="mcp-register-server-json"
            labelHelp={
              <FieldGroupHelpLabelIcon content="For more information about the server.json manifest, check the details page of the selected server." />
            }
          >
            <div
              data-testid="mcp-register-server-json-editor"
              onBlur={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                ) {
                  handleServerJsonBlur();
                }
              }}
            >
              <CodeEditor
                code={serverJsonContent}
                onCodeChange={handleServerJsonChange}
                onEditorDidMount={(editor) => {
                  editor.onDidBlurEditorWidget(handleServerJsonBlur);
                }}
                language={Language.json}
                isDarkTheme={theme === 'dark'}
                height="280px"
                isLanguageLabelVisible
              />
            </div>
            {showServerJsonError && serverJsonSubmitError && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" data-testid="mcp-register-server-json-error">
                    {serverJsonSubmitError}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>

          <FormGroup label="Status" isRequired fieldId="mcp-register-status">
            <SimpleSelect
              dataTestId="mcp-register-status"
              value={status}
              options={STATUS_OPTIONS}
              popperProps={{ maxWidth: 'none' }}
              onChange={(key) => {
                if (key === McpRegisterStatus.DRAFT || key === McpRegisterStatus.ACTIVE) {
                  setStatus(key);
                }
              }}
            />
          </FormGroup>

          <FormGroup label="Source" fieldId="mcp-register-source">
            <TextInput
              id="mcp-register-source"
              value={sourceValue}
              placeholder="https://github.com/org/repo"
              onChange={(_event, value) => setSourceValue(value)}
              data-testid="mcp-register-source"
            />
          </FormGroup>

          <McpServerIconsField
            icons={icons}
            onChange={setIcons}
            officialIcons={officialIcons}
            onStatusChange={handleIconStatusChange}
          />

          <McpServerTagsField tags={tags} onChange={setTags} />
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Register"
          onSubmit={handleRegister}
          onCancel={() => onClose()}
          isSubmitDisabled={isRegisterDisabled}
          isSubmitLoading={isSubmitting}
          error={submitError}
          alertTitle="Registration failed"
        />
      </ModalFooter>
    </Modal>
  );
};

export default McpRegisterModal;
