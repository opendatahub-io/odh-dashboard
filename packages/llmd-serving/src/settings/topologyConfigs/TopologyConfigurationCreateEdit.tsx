import * as React from 'react';
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import YAML from 'yaml';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import {
  getDisplayNameFromK8sResource,
  isK8sNameDescriptionDataValid,
  translateDisplayNameForK8s,
} from '@odh-dashboard/k8s-core';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { TopologyConfigContext } from './TopologyConfigContext';
import { TOPOLOGY_CONFIGS_TAB_PATH } from './paths';
import ConfigYAMLEditor from '../ConfigYAMLEditor';
import { overrideLlmConfigFields } from '../configYamlUtils';
import {
  type LLMInferenceServiceConfigKind,
  TopologyType,
  TopologyTypeLabels,
  CONFIG_TYPE_LABEL,
} from '../../types';
import {
  isConfigObject,
  cleanResourceForYAMLViewer,
  stripDuplicatingAnnotations,
  stripDuplicatingLabels,
} from '../../utils';
import {
  createLLMInferenceServiceConfig,
  patchLLMInferenceServiceConfig,
} from '../../api/LLMInferenceServiceConfigs';

const TopologyConfigurationCreateEditInner: React.FC<{
  sourceConfig?: LLMInferenceServiceConfigKind;
  isDuplicate: boolean;
}> = ({ sourceConfig, isDuplicate }) => {
  const listPath = TOPOLOGY_CONFIGS_TAB_PATH;
  const { topologyType, configName } = useParams<{
    topologyType?: string;
    configName?: string;
  }>();
  const navigate = useNavigate();
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();

  const isEditMode = !!configName && !isDuplicate;
  const existingConfig = !isDuplicate ? sourceConfig : undefined;
  const duplicateSource = isDuplicate ? sourceConfig : undefined;

  const resolvedTopologyType = React.useMemo((): TopologyType | undefined => {
    if (existingConfig) {
      const label = existingConfig.metadata.labels?.[CONFIG_TYPE_LABEL];
      return Object.values(TopologyType).find((t) => t === label);
    }
    if (duplicateSource) {
      const label = duplicateSource.metadata.labels?.[CONFIG_TYPE_LABEL];
      return Object.values(TopologyType).find((t) => t === label);
    }
    return Object.values(TopologyType).find((t) => t === topologyType);
  }, [existingConfig, duplicateSource, topologyType]);

  const initialResource = React.useMemo(() => {
    if (existingConfig) {
      return existingConfig;
    }
    if (duplicateSource) {
      const cleanMeta = cleanResourceForYAMLViewer(duplicateSource.metadata);
      const duplicateDisplayName = `Copy of ${getDisplayNameFromK8sResource(duplicateSource)}`;
      return {
        ...duplicateSource,
        metadata: {
          ...cleanMeta,
          name: translateDisplayNameForK8s(duplicateDisplayName),
          annotations: {
            ...cleanMeta.annotations,
            'openshift.io/display-name': duplicateDisplayName,
          },
        },
      };
    }
    return undefined;
  }, [existingConfig, duplicateSource]);

  const k8sNameDesc = useK8sNameDescriptionFieldData({
    initialData: initialResource,
    editableK8sName: isDuplicate,
  });

  const [yamlCode, setYamlCode] = React.useState(() => {
    if (existingConfig) {
      return YAML.stringify(existingConfig);
    }
    if (duplicateSource) {
      const cleanMeta = cleanResourceForYAMLViewer(duplicateSource.metadata);
      const cleanAnnotations = stripDuplicatingAnnotations(cleanMeta.annotations);
      const cleanLabels = stripDuplicatingLabels(cleanMeta.labels);
      const duplicateDisplayName = `Copy of ${getDisplayNameFromK8sResource(duplicateSource)}`;
      return YAML.stringify({
        apiVersion: duplicateSource.apiVersion,
        kind: duplicateSource.kind,
        metadata: {
          ...cleanMeta,
          name: translateDisplayNameForK8s(duplicateDisplayName),
          annotations: {
            ...cleanAnnotations,
            'openshift.io/display-name': duplicateDisplayName,
          },
          labels: cleanLabels,
        },
        spec: duplicateSource.spec,
      });
    }
    return '';
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const [configSource, setConfigSource] = React.useState<'template' | 'editor' | undefined>(
    undefined,
  );
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [templateError, setTemplateError] = React.useState(false);

  React.useEffect(() => {
    if (!resolvedTopologyType || isEditMode || isDuplicate) {
      return;
    }
    setTemplateError(false);
    fetch(`/api/service/model-serving/api/v1/samples/llm-d?type=${resolvedTopologyType}`)
      .then((res) => {
        if (!res.ok) {
          setTemplateError(true);
        }
      })
      .catch(() => {
        setTemplateError(true);
      });
  }, [resolvedTopologyType, isEditMode, isDuplicate]);

  const handleConfigSourceChange = (key: string) => {
    if (key === 'template') {
      setConfigSource('template');
      if (!resolvedTopologyType) {
        return;
      }
      setTemplateLoading(true);
      fetch(`/api/service/model-serving/api/v1/samples/llm-d?type=${resolvedTopologyType}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Template not found');
          }
          return res.text();
        })
        .then((yaml) => {
          setYamlCode(yaml);
        })
        .catch(() => {
          setTemplateError(true);
          notification.error(
            'Unable to pull template',
            'No sample configuration found for this topology type.',
          );
        })
        .finally(() => {
          setTemplateLoading(false);
        });
    } else if (key === 'editor') {
      setConfigSource('editor');
      setYamlCode('');
    }
  };

  const topologyTypeLabel = resolvedTopologyType
    ? TopologyTypeLabels[resolvedTopologyType]
    : 'Unknown';

  const sourceDisplayName = duplicateSource ? getDisplayNameFromK8sResource(duplicateSource) : '';

  const pageTitle = isDuplicate
    ? 'Duplicate llm-d topology configuration'
    : isEditMode
    ? `Edit ${k8sNameDesc.data.name || configName}`
    : `Add ${topologyTypeLabel} configuration`;

  const pageDescription = isDuplicate
    ? `Create a copy based on ${sourceDisplayName}. Update the configuration before saving.`
    : !isEditMode
    ? 'Add a new topology configuration that will be available for users on this cluster.'
    : undefined;

  const showEditor =
    isEditMode ||
    isDuplicate ||
    configSource === 'editor' ||
    (configSource === 'template' && yamlCode !== '');

  const configSourceOptions: SimpleSelectOption[] = [
    {
      key: 'template',
      label: 'Start from a sample configuration file',
      isDisabled: templateError,
      isAriaDisabled: templateError,
      description: templateError ? 'Unable to pull template' : undefined,
    },
    {
      key: 'editor',
      label: 'Open code editor',
    },
  ];

  const handleSubmit = async () => {
    if (!resolvedTopologyType) {
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const resourceName = isEditMode && configName ? configName : k8sNameDesc.data.k8sName.value;
      if (!resourceName) {
        throw new Error('Name must contain at least one alphanumeric character');
      }

      const parsed: unknown = YAML.parse(yamlCode);
      if (!isConfigObject(parsed)) {
        throw new Error('YAML must represent a valid kubernetes resource object');
      }

      const newConfig = overrideLlmConfigFields(parsed, {
        name: resourceName,
        namespace: dashboardNamespace,
        displayName: k8sNameDesc.data.name,
        description: k8sNameDesc.data.description,
        labels: { [CONFIG_TYPE_LABEL]: resolvedTopologyType },
      });

      if (isEditMode && existingConfig) {
        await patchLLMInferenceServiceConfig(existingConfig, newConfig);
      } else {
        await createLLMInferenceServiceConfig(newConfig);
      }
      navigate(listPath);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Unknown error');
      setError(err);
      notification.error(
        `Error ${isEditMode ? 'updating' : 'creating'} configuration`,
        err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ApplicationsPage
      title={pageTitle}
      description={pageDescription}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to={listPath}>llm-d topology configurations</Link>} />
          <BreadcrumbItem isActive>{pageTitle}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
      data-testid="topology-config-create-edit-page"
    >
      <Form style={{ height: '100%' }}>
        <K8sNameDescriptionField
          data={k8sNameDesc.data}
          dataTestId="topology-config"
          onDataChange={k8sNameDesc.onDataChange}
        />
        {!isEditMode && !isDuplicate && (
          <FormGroup label="Configuration source" isRequired fieldId="config-source">
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Select how to provide the topology configuration.</HelperTextItem>
              </HelperText>
            </FormHelperText>
            <SimpleSelect
              options={configSourceOptions}
              value={configSource}
              placeholder="Select a configuration source..."
              onChange={handleConfigSourceChange}
              isDisabled={templateLoading}
              isFullWidth
              dataTestId="config-source-select"
            />
          </FormGroup>
        )}
        {showEditor && (
          <FormGroup
            label="LLMInferenceServiceConfig YAML"
            isRequired
            fieldId="config-yaml"
            style={{ flex: 1 }}
          >
            <ConfigYAMLEditor
              code={yamlCode}
              onCodeChange={setYamlCode}
              topologyTypeLabel={topologyTypeLabel}
              isUploadEnabled={configSource !== 'template'}
            />
          </FormGroup>
        )}
        {error && (
          <Alert
            isInline
            variant="danger"
            title={error.name}
            actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
          >
            {error.message}
          </Alert>
        )}
        <ActionGroup>
          <Button
            variant="primary"
            data-testid="submit-topology-config-button"
            isDisabled={
              !isK8sNameDescriptionDataValid(k8sNameDesc.data) || !yamlCode.trim() || loading
            }
            isLoading={loading}
            onClick={handleSubmit}
          >
            {isEditMode ? 'Update' : 'Create'}
          </Button>
          <Button
            variant="link"
            data-testid="cancel-topology-config-button"
            isDisabled={loading}
            onClick={() => navigate(listPath)}
          >
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </ApplicationsPage>
  );
};

type TopologyConfigurationCreateEditProps = {
  /** True when mounted at the duplicate route. */
  isDuplicate?: boolean;
};

const TopologyConfigurationCreateEdit: React.FC<TopologyConfigurationCreateEditProps> = ({
  isDuplicate = false,
}) => {
  const listPath = TOPOLOGY_CONFIGS_TAB_PATH;
  const { configName, topologyType } = useParams<{
    configName?: string;
    topologyType?: string;
  }>();
  const { configs } = React.useContext(TopologyConfigContext);

  const sourceConfig = React.useMemo(
    () => (configName ? configs.find((c) => c.metadata.name === configName) : undefined),
    [configs, configName],
  );

  // On the add route the topology type comes from the URL; reject an unsupported
  // value (e.g. /add/not-a-topology) rather than rendering an unusable form.
  // Edit/duplicate routes have no topologyType param, so this is a no-op there.
  // An arbitrary/typo'd type is not a real resource, so redirect silently.
  const hasValidTopologyType =
    !topologyType || Object.values(TopologyType).some((t) => t === topologyType);
  if (!hasValidTopologyType) {
    return <Navigate to={listPath} replace />;
  }

  // For edit and duplicate, the named config must exist (context is already
  // loaded — the provider gates on that). When it doesn't, tell the user rather
  // than silently redirecting — a deep link or reload to a deleted/renamed
  // config should explain what happened. Matches the pattern used by serving
  // runtimes, connection types, and hardware profiles. The copy reflects the
  // active operation so a missing duplicate target isn't labelled as an edit.
  if (configName && !sourceConfig) {
    const operationLabel = isDuplicate ? 'Duplicate' : 'Edit';
    return (
      <ApplicationsPage
        loaded
        empty={false}
        title={`${operationLabel} llm-d topology configuration`}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem
              render={() => <Link to={listPath}>llm-d topology configurations</Link>}
            />
            <BreadcrumbItem isActive>{operationLabel}</BreadcrumbItem>
          </Breadcrumb>
        }
        provideChildrenPadding
      >
        <Bullseye>
          <EmptyState
            headingLevel="h2"
            icon={ExclamationCircleIcon}
            titleText={`Unable to ${isDuplicate ? 'duplicate' : 'edit'} topology configuration`}
          >
            <EmptyStateBody>
              We were unable to find a topology configuration named &quot;{configName}&quot;.
            </EmptyStateBody>
            <EmptyStateFooter>
              <Button
                variant="primary"
                component={(props: React.ComponentProps<'a'>) => <Link {...props} to={listPath} />}
              >
                Return to the list
              </Button>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
      </ApplicationsPage>
    );
  }

  return (
    <TopologyConfigurationCreateEditInner isDuplicate={isDuplicate} sourceConfig={sourceConfig} />
  );
};

export default TopologyConfigurationCreateEdit;
