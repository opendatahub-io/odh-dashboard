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
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { SimpleSelect } from 'mod-arch-shared';
import { SimpleSelectOption } from 'mod-arch-shared/dist/components/SimpleSelect';
import { APIOptions, useQueryParamNamespaces } from 'mod-arch-core';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import useMcpServerConverter from '~/app/hooks/mcpCatalogDeployment/useMcpServerConverter';
import { createMcpDeployment } from '~/app/api/mcpCatalogDeployment/service';
import { mcpServerCRToYaml } from '~/app/utils/mcpServerYaml';

type McpDeployModalProps = {
  onClose: () => void;
};

const McpDeployModal: React.FC<McpDeployModalProps> = ({ onClose }) => {
  const { serverId = '' } = useParams<{ serverId: string }>();
  const queryParams = useQueryParamNamespaces();
  const [crData, crLoaded, crError] = useMcpServerConverter(serverId);

  const [namespaces, namespacesLoaded] = useNamespaces();
  const [selectedNamespace, setSelectedNamespace] = React.useState('');
  const [yamlContent, setYamlContent] = React.useState('');
  const [initialYaml, setInitialYaml] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();

  const ociImage = crData?.spec.source.containerImage?.ref ?? '';

  React.useEffect(() => {
    if (crData && !yamlContent) {
      const yaml = mcpServerCRToYaml(crData);
      setYamlContent(yaml);
      setInitialYaml(yaml);
    }
  }, [crData, yamlContent]);

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
    if (!ociImage || !selectedNamespace) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      const opts: APIOptions = { signal: new AbortController().signal };
      await createMcpDeployment('', { ...queryParams, namespace: selectedNamespace })(opts, {
        image: ociImage,
        yaml: yamlContent,
        port: crData?.spec.config.port,
      });
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e : new Error('Failed to deploy MCP server'));
    } finally {
      setIsSubmitting(false);
    }
  }, [ociImage, selectedNamespace, yamlContent, crData, queryParams, onClose]);

  const isDeployDisabled = !ociImage || !selectedNamespace || isSubmitting || !crLoaded;

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
                bodyContent="The MCPServer custom resource spec for this deployment. Edit the configuration as needed before deploying."
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
              Catalog supplies a production-ready template (secretKeyRef, dedicated SA). Edit as
              needed.
            </Content>
            <TextArea
              id="mcp-deploy-yaml"
              value={yamlContent}
              onChange={(_event, value) => setYamlContent(value)}
              aria-label="MCP server YAML configuration"
              rows={18}
              resizeOrientation="vertical"
              style={{ fontFamily: 'var(--pf-t--global--font--family--mono)', fontSize: '13px' }}
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
        <Button
          variant="primary"
          onClick={handleDeploy}
          isDisabled={isDeployDisabled}
          isLoading={isSubmitting}
          data-testid="mcp-deploy-submit-button"
        >
          Deploy
        </Button>
        <Button
          variant="secondary"
          onClick={handleReset}
          isDisabled={isSubmitting}
          data-testid="mcp-deploy-reset-button"
        >
          Reset
        </Button>
        <Button variant="link" onClick={onClose} data-testid="mcp-deploy-close-button">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default McpDeployModal;
