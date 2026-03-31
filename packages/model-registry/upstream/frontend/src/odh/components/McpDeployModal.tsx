import React from 'react';
import { useParams } from 'react-router';
import {
  Alert,
  Button,
  Content,
  Form,
  FormGroup,
  FormGroupLabelHelp,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Popover,
  Spinner,
  Split,
  SplitItem,
  TextInput,
} from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { SimpleSelect } from 'mod-arch-shared';
import { SimpleSelectOption } from 'mod-arch-shared/dist/components/SimpleSelect';
import { APIOptions, useQueryParamNamespaces } from 'mod-arch-core';
import { useThemeContext } from '@odh-dashboard/internal/app/ThemeContext';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import useMcpServerConverter from '~/app/hooks/mcpCatalogDeployment/useMcpServerConverter';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { useNotification } from '~/app/hooks/useNotification';
import { createMcpDeployment } from '~/app/api/mcpCatalogDeployment/service';
import { mcpServerCRToYaml } from '~/app/utils/mcpServerYaml';

type McpDeployModalProps = {
  onClose: () => void;
};

const McpDeployModal: React.FC<McpDeployModalProps> = ({ onClose }) => {
  const { serverId = '' } = useParams<{ serverId: string }>();
  const queryParams = useQueryParamNamespaces();
  const { theme } = useThemeContext();
  const notification = useNotification();
  const [crData, crLoaded, crError] = useMcpServerConverter(serverId);

  const { data: nameDescData, onDataChange: onNameDescChange } =
    useK8sNameDescriptionFieldData();

  const [namespaces, namespacesLoaded] = useNamespaces();
  const [selectedNamespace, setSelectedNamespace] = React.useState('');
  const [yamlContent, setYamlContent] = React.useState('');
  const [initialYaml, setInitialYaml] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();
  const abortControllerRef = React.useRef<AbortController>();

  const ociImage = crData?.spec.source.containerImage?.ref ?? '';

  React.useEffect(() => {
    if (crData && !yamlContent) {
      const yaml = mcpServerCRToYaml(crData);
      setYamlContent(yaml);
      setInitialYaml(yaml);
    }
  }, [crData, yamlContent]);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const namespaceOptions: SimpleSelectOption[] = React.useMemo(
    () => namespaces.map((ns) => ({ key: ns.name, label: ns.name })),
    [namespaces],
  );

  const handleNamespaceChange = React.useCallback((key: string, isPlaceholder: boolean) => {
    if (!isPlaceholder && key) {
      setSelectedNamespace(key);
    }
  }, []);

  const handleReset = React.useCallback(() => {
    setYamlContent(initialYaml);
    setSelectedNamespace('');
    setSubmitError(undefined);
  }, [initialYaml]);

  const handleDeploy = React.useCallback(async () => {
    if (!ociImage || !selectedNamespace || !nameDescData.k8sName.value) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const opts: APIOptions = { signal: controller.signal };
      await createMcpDeployment('', { ...queryParams, namespace: selectedNamespace })(opts, {
        name: nameDescData.k8sName.value,
        displayName: nameDescData.name,
        image: ociImage,
        yaml: yamlContent,
        port: crData?.spec.config.port,
      });
      onClose();
      notification.success(
        'MCP server deployed successfully',
        `${nameDescData.name || nameDescData.k8sName.value} has been deployed to ${selectedNamespace}.`,
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e : new Error('Failed to deploy MCP server'));
    } finally {
      setIsSubmitting(false);
    }
  }, [ociImage, selectedNamespace, nameDescData, yamlContent, crData, queryParams, onClose, notification]);

  const hasValidName =
    !!nameDescData.name &&
    !!nameDescData.k8sName.value &&
    !nameDescData.k8sName.state.invalidCharacters &&
    !nameDescData.k8sName.state.invalidLength;

  const isDeployDisabled =
    !hasValidName || !ociImage || !selectedNamespace || isSubmitting || !crLoaded;

  const ociImageLabelHelpRef = React.useRef<HTMLSpanElement>(null);
  const configLabelHelpRef = React.useRef<HTMLSpanElement>(null);

  if (!crLoaded && !crError) {
    return (
      <Modal isOpen variant="medium" onClose={onClose} data-testid="mcp-deploy-modal">
        <ModalHeader title="Deploy MCP server" />
        <ModalBody>
          <Spinner aria-label="Loading MCP server configuration" />
        </ModalBody>
      </Modal>
    );
  }

  return (
    <Modal isOpen variant="medium" onClose={onClose} data-testid="mcp-deploy-modal">
      <ModalHeader title="Deploy MCP server" />
      <ModalBody>
        {crError && (
          <Alert
            variant="danger"
            isInline
            title="Failed to load MCP server configuration"
            className="pf-v6-u-mb-md"
            data-testid="mcp-deploy-load-error"
          >
            {crError.message}
          </Alert>
        )}
        <Form>
          <K8sNameDescriptionField
            data={nameDescData}
            onDataChange={onNameDescChange}
            dataTestId="mcp-deploy"
            nameLabel="Deployment name"
            hideDescription
          />

          <FormGroup
            label="OCI image"
            isRequired
            fieldId="mcp-deploy-oci-image"
            labelHelp={
              <Popover
                triggerRef={ociImageLabelHelpRef}
                bodyContent="The container image reference for this MCP server, sourced from the catalog artifact."
                aria-label="OCI image help"
              >
                <FormGroupLabelHelp
                  ref={ociImageLabelHelpRef}
                  aria-label="More info for OCI image field"
                />
              </Popover>
            }
          >
            <TextInput
              id="mcp-deploy-oci-image"
              value={ociImage}
              isDisabled
              data-testid="mcp-deploy-oci-image-input"
            />
          </FormGroup>

          <FormGroup label="Project" isRequired fieldId="mcp-deploy-project">
            <SimpleSelect
              options={namespaceOptions}
              value={selectedNamespace}
              onChange={handleNamespaceChange}
              placeholder="Select a project"
              isDisabled={!namespacesLoaded || namespaces.length === 0}
              isFullWidth
              isScrollable
              maxMenuHeight="300px"
              dataTestId="mcp-deploy-project-selector"
            />
          </FormGroup>

          <FormGroup
            label="Configuration (YAML)"
            fieldId="mcp-deploy-yaml"
            labelHelp={
              <Popover
                triggerRef={configLabelHelpRef}
                bodyContent="Prefilled from catalog metadata when available; you can adjust before deploying. This block is the spec fragment only (not the full CRD); it is merged into the MCPServer resource—image and project are set by the form. For more options, see the server documentation on the details page."
                aria-label="Configuration help"
              >
                <FormGroupLabelHelp
                  ref={configLabelHelpRef}
                  aria-label="More info for configuration field"
                />
              </Popover>
            }
          >
            <Content component="small" className="pf-v6-u-mb-sm">
              Prefilled from catalog metadata. Adjust runtime, config, and environment settings as
              needed.
            </Content>
            <CodeEditor
              code={yamlContent}
              onCodeChange={setYamlContent}
              language={Language.yaml}
              isDarkTheme={theme === 'dark'}
              height="300px"
              isLanguageLabelVisible
              data-testid="mcp-deploy-yaml-editor"
            />
          </FormGroup>
        </Form>

        {submitError && (
          <Alert
            variant="danger"
            isInline
            title="Deployment failed"
            className="pf-v6-u-mt-md"
            data-testid="mcp-deploy-submit-error"
          >
            {submitError.message}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Split hasGutter className="pf-v6-u-w-100">
          <SplitItem>
            <Button variant="link" onClick={onClose} data-testid="mcp-deploy-close-button">
              Close
            </Button>
          </SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            <Button
              variant="secondary"
              onClick={handleReset}
              isDisabled={isSubmitting}
              data-testid="mcp-deploy-reset-button"
            >
              Reset
            </Button>
          </SplitItem>
          <SplitItem>
            <Button
              variant="primary"
              onClick={handleDeploy}
              isDisabled={isDeployDisabled}
              isLoading={isSubmitting}
              data-testid="mcp-deploy-submit-button"
            >
              Deploy
            </Button>
          </SplitItem>
        </Split>
      </ModalFooter>
    </Modal>
  );
};

export default McpDeployModal;
