import React from 'react';
import { useNavigate, useParams } from 'react-router';
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
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { APIOptions, useQueryParamNamespaces } from 'mod-arch-core';
import { useThemeContext } from '@odh-dashboard/internal/app/ThemeContext';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';
import useMcpServerConverter from '~/app/hooks/mcpCatalogDeployment/useMcpServerConverter';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { createMcpDeployment, updateMcpDeployment } from '~/app/api/mcpCatalogDeployment/service';
import { mcpDeploymentsUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import { mcpServerCRToYaml } from '~/app/utils/mcpServerYaml';
import { McpDeployment } from '~/app/mcpDeploymentTypes';

type McpDeployModalProps = {
  isOpen?: boolean;
  onClose: (saved?: boolean) => void;
  existingDeployment?: McpDeployment;
};

const McpDeployModal: React.FC<McpDeployModalProps> = ({
  isOpen = true,
  onClose,
  existingDeployment,
}) => {
  const { serverId = '' } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const queryParams = useQueryParamNamespaces();
  const { theme } = useThemeContext();
  const [crData, crLoaded, crError] = useMcpServerConverter(existingDeployment ? '' : serverId);

  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData(
    existingDeployment
      ? {
          initialData: {
            name: existingDeployment.displayName ?? existingDeployment.name,
            k8sName: existingDeployment.name,
          },
        }
      : {},
  );

  const [selectedNamespace, setSelectedNamespace] = React.useState(
    existingDeployment?.namespace ?? '',
  );
  const [yamlContent, setYamlContent] = React.useState(existingDeployment?.yaml ?? '');
  const [ociImageValue, setOciImageValue] = React.useState(existingDeployment?.image ?? '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();
  const abortControllerRef = React.useRef<AbortController>();
  const crInitializedRef = React.useRef(false);
  const ociImageLabelHelpRef = React.useRef<HTMLSpanElement>(null);
  const configLabelHelpRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!existingDeployment && crData && !crInitializedRef.current) {
      crInitializedRef.current = true;
      const yaml = mcpServerCRToYaml(crData);
      setYamlContent(yaml);
      setOciImageValue(crData.spec.source.containerImage?.ref ?? '');
    }
  }, [existingDeployment, crData]);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleNamespaceSelect = React.useCallback((projectName: string) => {
    setSelectedNamespace(projectName);
  }, []);

  const displayName = nameDescData.name;
  const k8sName = nameDescData.k8sName.value;

  const handleDeploy = React.useCallback(async () => {
    if (!ociImageValue || !selectedNamespace || !k8sName) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const opts: APIOptions = { signal: controller.signal };
      if (existingDeployment) {
        await updateMcpDeployment('', { ...queryParams, namespace: selectedNamespace })(
          opts,
          existingDeployment.name,
          {
            displayName,
            image: ociImageValue,
            yaml: yamlContent,
          },
        );
        onClose(true);
      } else {
        await createMcpDeployment('', { ...queryParams, namespace: selectedNamespace })(opts, {
          name: k8sName,
          displayName,
          serverName: crData?.metadata.name || undefined,
          image: ociImageValue,
          yaml: yamlContent,
        });
        onClose(true);
        navigate(mcpDeploymentsUrl(selectedNamespace));
      }
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e
          : new Error(`Failed to ${existingDeployment ? 'update' : 'deploy'} MCP server`),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    ociImageValue,
    selectedNamespace,
    k8sName,
    displayName,
    yamlContent,
    crData,
    queryParams,
    onClose,
    navigate,
    existingDeployment,
  ]);

  const hasValidName =
    !!displayName &&
    !!k8sName &&
    !nameDescData.k8sName.state.invalidCharacters &&
    !nameDescData.k8sName.state.invalidLength;

  const dataReady = !!existingDeployment || crLoaded;

  const isDeployDisabled =
    !hasValidName || !ociImageValue || !selectedNamespace || isSubmitting || !dataReady;

  const modalTitle = existingDeployment ? 'Edit MCP server deployment' : 'Deploy MCP server';

  if (!existingDeployment && !crLoaded && !crError) {
    return (
      <Modal isOpen={isOpen} variant="medium" onClose={() => onClose()} data-testid="mcp-deploy-modal">
        <ModalHeader title={modalTitle} data-testid="mcp-deploy-modal-title" />
        <ModalBody>
          <Spinner aria-label="Loading MCP server configuration" data-testid="mcp-deploy-modal-spinner" />
        </ModalBody>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} variant="medium" onClose={() => onClose()} data-testid="mcp-deploy-modal">
      <ModalHeader title={modalTitle} data-testid="mcp-deploy-modal-title" />
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
                bodyContent="This is the container image associated with the MCP server that you selected from the catalog. This cannot be edited."
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
              value={ociImageValue}
              isDisabled
              data-testid="mcp-deploy-oci-image-input"
            />
          </FormGroup>

          {existingDeployment ? (
            <FormGroup label="Project" isRequired fieldId="mcp-deploy-project">
              <TextInput
                id="mcp-deploy-project"
                value={selectedNamespace}
                isDisabled
                data-testid="mcp-deploy-project-selector"
              />
            </FormGroup>
          ) : (
            <NamespaceSelectorFieldWrapper
              selectedNamespace={selectedNamespace}
              onSelect={handleNamespaceSelect}
            />
          )}

          <FormGroup
            label="YAML configuration"
            fieldId="mcp-deploy-yaml"
            labelHelp={
              <Popover
                triggerRef={configLabelHelpRef}
                bodyContent="For more information about the prefilled YAML configuration, check the details page of the selected server."
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
              This YAML has been prefilled from the selected server&apos;s metadata in the catalog.
              Edit as needed.
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

      </ModalBody>
      <ModalFooter>
        <Stack hasGutter style={{ flex: 'auto' }}>
          {submitError && (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title="Deployment failed"
                data-testid="mcp-deploy-submit-error"
              >
                {submitError.message}
              </Alert>
            </StackItem>
          )}
          <StackItem>
            <Split hasGutter className="pf-v6-u-w-100">
              <SplitItem>
                <Button variant="link" onClick={() => onClose()} data-testid="mcp-deploy-close-button">
                  Close
                </Button>
              </SplitItem>
              <SplitItem isFilled />
              <SplitItem>
                <Button
                  variant="primary"
                  onClick={handleDeploy}
                  isDisabled={isDeployDisabled}
                  isLoading={isSubmitting}
                  data-testid="mcp-deploy-submit-button"
                >
                  {existingDeployment ? 'Save' : 'Deploy'}
                </Button>
              </SplitItem>
            </Split>
          </StackItem>
        </Stack>
      </ModalFooter>
    </Modal>
  );
};

export default McpDeployModal;
