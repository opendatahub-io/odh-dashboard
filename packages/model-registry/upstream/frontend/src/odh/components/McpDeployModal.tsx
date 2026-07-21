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
import { McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';

type McpDeployModalProps = {
  isOpen?: boolean;
  onClose: (saved?: boolean) => void;
  data?: McpDeployModalData;
  isLoading?: boolean;
  loadError?: Error;
};

const McpDeployModal: React.FC<McpDeployModalProps> = ({
  isOpen = true,
  onClose,
  data,
  isLoading,
  loadError,
}) => {
  const isEdit = !!data?.name;
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
  const ociImageValue = data?.image ?? '';
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();
  const abortControllerRef = React.useRef<AbortController>();

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
        await createMcpDeployment('', { ...queryParams, namespace: selectedNamespace })(opts, {
          name: effectiveK8sName,
          displayName: displayNameValue,
          serverName: data?.serverName,
          image: ociImageValue,
          yaml: yamlContent,
        });
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
                <FieldGroupHelpLabelIcon content="This is the container image associated with the MCP server that you selected from the catalog. This cannot be edited." />
              }
            >
              <TextInput
                id="mcp-deploy-oci-image"
                value={ociImageValue}
                isDisabled
                data-testid="mcp-deploy-oci-image-input"
              />
            </FormGroup>

            {isEdit ? (
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
