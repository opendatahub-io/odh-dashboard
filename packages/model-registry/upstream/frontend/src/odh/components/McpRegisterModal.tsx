import React from 'react';
import { useNavigate } from 'react-router';
import {
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
import { DashboardModalFooter, FieldGroupHelpLabelIcon, SimpleSelect } from 'mod-arch-shared';
import type { SimpleSelectOption } from 'mod-arch-shared/dist/components/SimpleSelect';
import { useThemeContext } from '@odh-dashboard/internal/app/ThemeContext';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';
import McpServerIconsField from '~/odh/components/McpServerIconsField';
import McpServerTagsField from '~/odh/components/McpServerTagsField';
import { useNotification } from '~/app/hooks/useNotification';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import { mcpRegistryServerUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import type { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';
import type { MCPIcon, MCPServerVersionStatus, MCPTagEntry } from '~/odh/types/mcpRegistryTypes';
import {
  catalogToRegistryIcons,
  catalogToRegistryName,
  catalogToServerJson,
} from '~/odh/utils/catalogToRegistry';
import {
  isRecord,
  isValidMcpServerName,
  parseServerJsonIcons,
  sanitizeHref,
} from '~/odh/utils/registerUtils';
import { registerMcpServer } from '~/odh/utils/registerMcpServer';

const STATUS_OPTIONS: SimpleSelectOption[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'active', label: 'Active' },
];

type McpRegisterModalProps = {
  server: McpServer;
  deploySpec?: MCPServerCR['spec'];
  onClose: (saved?: boolean) => void;
};

const McpRegisterModal: React.FC<McpRegisterModalProps> = ({ server, deploySpec, onClose }) => {
  const notification = useNotification();
  const { theme } = useThemeContext();
  const navigate = useNavigate();

  const initialRegistryName = React.useMemo(() => catalogToRegistryName(server), [server]);

  const generateServerJsonContent = React.useCallback(
    (currentDeploySpec: MCPServerCR['spec'] | undefined) =>
      JSON.stringify(
        catalogToServerJson(
          server,
          initialRegistryName,
          server.displayName || server.name,
          currentDeploySpec,
        ),
        null,
        2,
      ),
    [server, initialRegistryName],
  );

  const [selectedNamespace, setSelectedNamespace] = React.useState('');
  const [displayNameValue, setDisplayNameValue] = React.useState(server.displayName || server.name);
  const [serverJsonContent, setServerJsonContent] = React.useState(() =>
    generateServerJsonContent(deploySpec),
  );
  const lastGeneratedContentRef = React.useRef(serverJsonContent);
  const lastDeploySpecRef = React.useRef(deploySpec);
  if (deploySpec !== lastDeploySpecRef.current) {
    lastDeploySpecRef.current = deploySpec;
    if (serverJsonContent === lastGeneratedContentRef.current) {
      const regenerated = generateServerJsonContent(deploySpec);
      lastGeneratedContentRef.current = regenerated;
      setServerJsonContent(regenerated);
    }
  }
  const [status, setStatus] = React.useState<MCPServerVersionStatus>('draft');
  const [sourceValue, setSourceValue] = React.useState(
    server.repositoryUrl || server.sourceCode || '',
  );
  const [icons, setIcons] = React.useState<MCPIcon[]>(() => catalogToRegistryIcons(server));
  const [tags, setTags] = React.useState<MCPTagEntry[]>([{ key: '', value: '' }]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();
  const abortControllerRef = React.useRef<AbortController>();

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const parsedServerJson = React.useMemo<Record<string, unknown> | undefined>(() => {
    try {
      const parsed = JSON.parse(serverJsonContent);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [serverJsonContent]);

  const serverJsonIcons = React.useMemo(
    () => parseServerJsonIcons(parsedServerJson),
    [parsedServerJson],
  );

  const hasValidServerJson =
    !!parsedServerJson &&
    typeof parsedServerJson.name === 'string' &&
    isValidMcpServerName(parsedServerJson.name) &&
    typeof parsedServerJson.version === 'string' &&
    !!parsedServerJson.version;

  const hasInvalidIcon = icons.some((icon) => icon.src.trim() && !sanitizeHref(icon.src));

  const isRegisterDisabled =
    !selectedNamespace || !hasValidServerJson || hasInvalidIcon || isSubmitting;

  const handleRegister = React.useCallback(async () => {
    if (!parsedServerJson || typeof parsedServerJson.name !== 'string') {
      return;
    }
    const targetName = parsedServerJson.name;

    setIsSubmitting(true);
    setSubmitError(undefined);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { version, metadataError, tagsError } = await registerMcpServer(
        {
          server,
          registryName: targetName,
          serverJson: parsedServerJson,
          displayName: displayNameValue,
          status,
          source: sourceValue || undefined,
          icons,
          tags,
        },
        {
          hostPath: '',
          queryParams: { workspace: selectedNamespace },
          opts: { signal: controller.signal },
        },
      );

      notification.success(`Registered as ${targetName} v${version.version}`);
      if (metadataError) {
        notification.warning('Display name and icons were not saved', metadataError.message);
      }
      if (tagsError) {
        notification.warning('Some tags were not saved', tagsError.message);
      }
      onClose(true);
      navigate(
        mcpRegistryServerUrl(targetName, {
          version: version.version,
          namespace: selectedNamespace,
        }),
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e : new Error('Failed to register MCP server'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    parsedServerJson,
    selectedNamespace,
    server,
    displayNameValue,
    icons,
    tags,
    status,
    sourceValue,
    notification,
    onClose,
    navigate,
  ]);

  return (
    <Modal isOpen variant="medium" onClose={() => onClose()} data-testid="mcp-register-modal">
      <ModalHeader title="Register MCP server" data-testid="mcp-register-modal-title" />
      <ModalBody>
        <Form>
          <NamespaceSelectorFieldWrapper
            selectedNamespace={selectedNamespace}
            onSelect={setSelectedNamespace}
            helperText="Registers this MCP server in the selected OpenShift project."
          />

          <FormGroup label="Display name" fieldId="mcp-register-display-name">
            <TextInput
              id="mcp-register-display-name"
              value={displayNameValue}
              placeholder="Human-readable label for this server"
              onChange={(_event, value) => setDisplayNameValue(value)}
              data-testid="mcp-register-display-name"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Optional. Shown as the human-readable label for this registration. Registry
                  placement is controlled by the name in server.json.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup
            label="server.json"
            isRequired
            fieldId="mcp-register-server-json"
            labelHelp={
              <FieldGroupHelpLabelIcon content="For more information about the server.json manifest, check the details page of the selected server." />
            }
          >
            <div data-testid="mcp-register-server-json-editor">
              <CodeEditor
                code={serverJsonContent}
                onCodeChange={setServerJsonContent}
                language={Language.json}
                isDarkTheme={theme === 'dark'}
                height="280px"
                isLanguageLabelVisible
              />
            </div>
          </FormGroup>

          <FormGroup label="Status" isRequired fieldId="mcp-register-status">
            <SimpleSelect
              dataTestId="mcp-register-status"
              value={status}
              options={STATUS_OPTIONS}
              popperProps={{ maxWidth: 'none' }}
              onChange={(key) => {
                if (key === 'draft' || key === 'active') {
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
            serverJsonIcons={serverJsonIcons}
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
