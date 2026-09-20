import React from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Bullseye,
  Content,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  TextInput,
} from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { APIOptions } from 'mod-arch-core';
import { DashboardModalFooter, FieldGroupHelpLabelIcon } from 'mod-arch-shared';
import { useThemeContext } from '@odh-dashboard/internal/app/ThemeContext';
import { isValidK8sName, translateDisplayNameForK8s } from '@odh-dashboard/k8s-core';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';
import K8sNameDescriptionField from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { K8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/types';
import { MAX_K8S_NAME_LENGTH } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import { createMcpDeployment, updateMcpDeployment } from '~/odh/api/mcpCatalogDeployment/service';
import { mcpDeploymentsUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import { McpDeployment, McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';

type McpDeployModalProps = {
  isOpen?: boolean;
  onClose: (saved?: boolean) => void;
  data?: McpDeployModalData;
  isLoading?: boolean;
  loadError?: Error;
  /**
   * Called after the CR is created, before `onClose`, for caller-specific follow-up.
   * Should catch and report its own errors — a rejection here doesn't fail the deploy itself.
   */
  onDeployed?: (deployment: McpDeployment) => void | Promise<void>;
};

const McpDeployModal: React.FC<McpDeployModalProps> = ({
  isOpen = true,
  onClose,
  data,
  isLoading,
  loadError,
  onDeployed,
}) => {
  const isEdit = !!data?.name;
  // Sole discriminator between the "registry" prefill flow (image editable, project fixed)
  // and the "catalog" flow (image read-only, project selectable) -- see the doc comment on
  // McpDeployModalData.registryServer. Centralized here so the three usages below can't drift
  // from each other or from this convention.
  const isRegistryPrefill = !!data?.registryServer;
  const navigate = useNavigate();
  const { theme } = useThemeContext();

  const [displayNameValue, setDisplayNameValue] = React.useState(
    data?.displayName ?? data?.name ?? '',
  );
  const [k8sNameManual, setK8sNameManual] = React.useState('');
  const [k8sTouched, setK8sTouched] = React.useState(false);

  const autoK8sName = React.useMemo(
    () => translateDisplayNameForK8s(displayNameValue),
    [displayNameValue],
  );
  const effectiveK8sName = isEdit ? (data.name ?? '') : k8sTouched ? k8sNameManual : autoK8sName;

  const nameDescData = React.useMemo<K8sNameDescriptionFieldData>(
    () => ({
      name: displayNameValue,
      description: '',
      k8sName: {
        value: effectiveK8sName,
        state: {
          immutable: isEdit,
          invalidCharacters:
            effectiveK8sName.length > 0 ? !isValidK8sName(effectiveK8sName) : false,
          invalidLength: effectiveK8sName.length > MAX_K8S_NAME_LENGTH,
          maxLength: MAX_K8S_NAME_LENGTH,
          touched: k8sTouched,
        },
      },
    }),
    [displayNameValue, effectiveK8sName, k8sTouched, isEdit],
  );

  const onNameDescChange = React.useCallback(
    (key: keyof K8sNameDescriptionFieldData, value: string) => {
      if (key === 'name') {
        setDisplayNameValue(value);
      } else if (key === 'k8sName') {
        setK8sNameManual(value);
        setK8sTouched(true);
      }
    },
    [],
  );

  const [selectedNamespace, setSelectedNamespace] = React.useState(data?.namespace ?? '');
  const queryParams = React.useMemo(() => ({ namespace: selectedNamespace }), [selectedNamespace]);
  const [yamlContent, setYamlContent] = React.useState(data?.yaml ?? '');
  const [ociImageValue, setOciImageValue] = React.useState(data?.image ?? '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();
  const abortControllerRef = React.useRef<AbortController>();

  // `data` can arrive after this modal has already mounted (e.g. the catalog flow opens the
  // modal immediately on click, before its CR-to-YAML converter resolves). useState's initial
  // value only applies once, so without these the image/YAML fields would stay stuck at their
  // initial (possibly empty) values forever. `!== undefined` (rather than truthiness) so a
  // field that resolves to an empty value still overwrites a stale non-empty one.
  React.useEffect(() => {
    if (data?.image !== undefined) {
      setOciImageValue(data.image);
    }
  }, [data?.image]);

  React.useEffect(() => {
    if (data?.yaml !== undefined) {
      setYamlContent(data.yaml);
    }
  }, [data?.yaml]);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleNamespaceSelect = React.useCallback((projectName: string) => {
    setSelectedNamespace(projectName);
  }, []);

  const handleDeploy = React.useCallback(async () => {
    if (!ociImageValue || !selectedNamespace || !effectiveK8sName) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const opts: APIOptions = { signal: controller.signal };
      if (isEdit && data.name) {
        await updateMcpDeployment('', { ...queryParams, namespace: selectedNamespace })(
          opts,
          data.name,
          {
            displayName: displayNameValue,
            image: ociImageValue,
            yaml: yamlContent,
          },
        );
        onClose(true);
      } else {
        const created = await createMcpDeployment('', {
          ...queryParams,
          namespace: selectedNamespace,
        })(opts, {
          name: effectiveK8sName,
          displayName: displayNameValue,
          serverName: data?.serverName,
          registryServer: data?.registryServer,
          registryVersion: data?.registryVersion,
          image: ociImageValue,
          yaml: yamlContent,
        });
        // The CR is already created at this point. `onDeployed`'s contract requires
        // implementations to handle their own errors, but don't let a caller that breaks that
        // contract report a deploy failure when the deployment actually succeeded.
        try {
          await onDeployed?.(created);
        } catch {
          // Intentionally swallowed — see comment above.
        }
        onClose(true);
        navigate(mcpDeploymentsUrl(selectedNamespace));
      }
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e : new Error(`Failed to ${isEdit ? 'update' : 'deploy'} MCP server`),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    ociImageValue,
    selectedNamespace,
    effectiveK8sName,
    displayNameValue,
    yamlContent,
    data,
    isEdit,
    queryParams,
    onClose,
    onDeployed,
    navigate,
  ]);

  const hasValidName =
    !!displayNameValue &&
    !!effectiveK8sName &&
    isValidK8sName(effectiveK8sName) &&
    effectiveK8sName.length <= MAX_K8S_NAME_LENGTH;

  const isDeployDisabled =
    isLoading ||
    !!loadError ||
    !hasValidName ||
    !ociImageValue ||
    !selectedNamespace ||
    isSubmitting;

  const modalTitle = isEdit ? 'Edit MCP server deployment' : 'Deploy MCP server';

  return (
    <Modal
      isOpen={isOpen}
      variant="medium"
      onClose={() => onClose()}
      data-testid="mcp-deploy-modal"
    >
      <ModalHeader title={modalTitle} data-testid="mcp-deploy-modal-title" />
      <ModalBody>
        {isLoading ? (
          <Bullseye>
            <Spinner />
          </Bullseye>
        ) : loadError ? (
          <Alert
            variant="danger"
            isInline
            title="Failed to load MCP server configuration"
            data-testid="mcp-deploy-load-error"
          >
            {loadError.message}
          </Alert>
        ) : (
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
                <FieldGroupHelpLabelIcon
                  content={
                    isRegistryPrefill
                      ? "Prefilled from the selected MCP server when available. If it's missing, enter the container image to deploy."
                      : 'This is the container image associated with the MCP server that you selected from the catalog. This cannot be edited.'
                  }
                />
              }
            >
              <TextInput
                id="mcp-deploy-oci-image"
                value={ociImageValue}
                isDisabled={!isRegistryPrefill}
                onChange={(_event, value) => setOciImageValue(value)}
                placeholder="e.g. quay.io/mcp/weather:1.2.0"
                data-testid="mcp-deploy-oci-image-input"
              />
            </FormGroup>

            <FormGroup
              label="Project"
              isRequired
              fieldId="mcp-deploy-project"
              labelHelp={
                <FieldGroupHelpLabelIcon content="Select the project to deploy this MCP server to." />
              }
            >
              <NamespaceSelectorFieldWrapper
                selectedNamespace={selectedNamespace}
                onSelect={handleNamespaceSelect}
                isDisabled={isEdit || isRegistryPrefill}
                selectorOnly
                isFullWidth
              />
            </FormGroup>

            <FormGroup
              label="YAML configuration"
              fieldId="mcp-deploy-yaml"
              labelHelp={
                <FieldGroupHelpLabelIcon content="For more information about the prefilled YAML configuration, check the details page of the selected server." />
              }
            >
              <Content component="small" className="pf-v6-u-mb-sm">
                This YAML has been prefilled from the selected server&apos;s metadata in the
                catalog. Edit as needed.
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
        )}
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={isEdit ? 'Save' : 'Deploy'}
          onSubmit={handleDeploy}
          onCancel={() => onClose()}
          isSubmitDisabled={isDeployDisabled}
          isSubmitLoading={isSubmitting}
          error={submitError}
          alertTitle="Deployment failed"
        />
      </ModalFooter>
    </Modal>
  );
};

export default McpDeployModal;
