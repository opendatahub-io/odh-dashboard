import * as React from 'react';
import {
  ActionGroup,
  Alert,
  AlertActionCloseButton,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Form,
  FormGroup,
  Stack,
  StackItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import YAML from 'yaml';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import {
  getDisplayNameFromK8sResource,
  getDescriptionFromK8sResource,
} from '@odh-dashboard/k8s-core';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import ConfigSourceSelect from './ConfigSourceSelect';
import ConfigYAMLEditor from './ConfigYAMLEditor';
import {
  type LLMInferenceServiceConfigKind,
  LLMInferenceServiceConfigModel,
  TopologyType,
  TopologyTypeLabels,
  CONFIG_TYPE_LABEL,
  DASHBOARD_RESOURCE_LABEL,
} from '../types';
import {
  createLLMInferenceServiceConfig,
  patchLLMInferenceServiceConfig,
  useWatchTopologyConfigs,
} from '../api/LLMInferenceServiceConfigs';

const getSampleYaml = (topoType: TopologyType): string => {
  const comments: Record<TopologyType, string> = {
    [TopologyType.SINGLE_NODE]: 'Single-node topology — single replica, no scheduler.',
    [TopologyType.MULTI_NODE]:
      'Multi-node topology — distributed data-parallel groups for large dense models.',
    [TopologyType.SINGLE_NODE_DISAGGREGATED]:
      'Single-node disaggregated — prefill/decode split for TTFT-sensitive and long-context workloads.',
    [TopologyType.MULTI_NODE_DISAGGREGATED]:
      'Multi-node disaggregated — distributed prefill/decode across distributed node groups.',
  };

  return [
    'apiVersion: serving.kserve.io/v1alpha1',
    'kind: LLMInferenceServiceConfig',
    'metadata:',
    '  name: my-topology-configuration',
    'spec:',
    `  # ${comments[topoType]}`,
    '  templateRef: kserve-config-llm-template',
    '',
  ].join('\n');
};

const TopologyConfigurationCreateEdit: React.FC = () => {
  const { topologyType, configName } = useParams<{
    topologyType?: string;
    configName?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();

  const isDuplicateMode = location.pathname.includes('/duplicate/');
  const isEditMode = !!configName && !isDuplicateMode;
  const [configs] = useWatchTopologyConfigs(dashboardNamespace);
  const sourceConfig = React.useMemo(
    () => (configName ? configs.find((c) => c.metadata.name === configName) : undefined),
    [configs, configName],
  );

  const resolvedTopologyType = React.useMemo((): TopologyType | undefined => {
    if (sourceConfig) {
      const label = sourceConfig.metadata.labels?.[CONFIG_TYPE_LABEL];
      return Object.values(TopologyType).find((t) => t === label);
    }
    return Object.values(TopologyType).find((t) => t === topologyType);
  }, [sourceConfig, topologyType]);

  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [yamlValue, setYamlValue] = React.useState('');
  const [configSource, setConfigSource] = React.useState<'sample' | 'upload' | 'blank' | undefined>(
    undefined,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (sourceConfig) {
      setDisplayName(getDisplayNameFromK8sResource(sourceConfig));
      setDescription(getDescriptionFromK8sResource(sourceConfig));
      setYamlValue(sourceConfig.spec ? YAML.stringify(sourceConfig.spec) : '');
    }
  }, [sourceConfig]);

  const topologyTypeLabel = resolvedTopologyType
    ? TopologyTypeLabels[resolvedTopologyType]
    : 'Unknown';

  const sourceName = sourceConfig ? getDisplayNameFromK8sResource(sourceConfig) : configName ?? '';

  const title = isDuplicateMode
    ? 'Duplicate llm-d topology configuration'
    : isEditMode
    ? `Edit ${displayName || configName}`
    : `Add ${topologyTypeLabel} configuration`;

  const pageDescription = isDuplicateMode
    ? `Create a copy based on ${sourceName}. Update the configuration before saving.`
    : !isEditMode
    ? 'Add a new topology configuration that will be available for users on this cluster.'
    : undefined;

  const handleSubmit = async () => {
    if (!resolvedTopologyType) {
      return;
    }

    setLoading(true);
    setError(undefined);

    let spec: LLMInferenceServiceConfigKind['spec'];
    try {
      const parsed: unknown = yamlValue ? YAML.parse(yamlValue) : undefined;
      spec = parsed as LLMInferenceServiceConfigKind['spec']; // eslint-disable-line @typescript-eslint/consistent-type-assertions
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Invalid YAML'));
      setLoading(false);
      return;
    }

    const slug = displayName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const resourceName = isEditMode && configName ? configName : slug;

    if (!resourceName) {
      setError(new Error('Name must contain at least one alphanumeric character'));
      setLoading(false);
      return;
    }

    const apiGroup = LLMInferenceServiceConfigModel.apiGroup ?? '';
    const apiVer = LLMInferenceServiceConfigModel.apiVersion;
    const newConfig: LLMInferenceServiceConfigKind = {
      apiVersion: `${apiGroup}/${apiVer}`,
      kind: 'LLMInferenceServiceConfig',
      metadata: {
        name: resourceName,
        namespace: dashboardNamespace,
        labels: {
          [CONFIG_TYPE_LABEL]: resolvedTopologyType,
          [DASHBOARD_RESOURCE_LABEL]: 'true',
        },
        annotations: {
          'openshift.io/display-name': displayName,
          'openshift.io/description': description,
        },
      },
      spec,
    };

    try {
      if (isEditMode && sourceConfig) {
        await patchLLMInferenceServiceConfig(sourceConfig, newConfig);
      } else {
        await createLLMInferenceServiceConfig(newConfig);
      }
      navigate('..');
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
      title={title}
      description={pageDescription}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="..">llm-d topology configurations</Link>} />
          <BreadcrumbItem isActive>{title}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
      data-testid="topology-config-create-edit-page"
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            <FormGroup label="Name" isRequired fieldId="config-name">
              <TextInput
                id="config-name"
                data-testid="config-name-input"
                value={displayName}
                onChange={(_e, value) => setDisplayName(value)}
                isDisabled={isEditMode && !isDuplicateMode}
                isRequired
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Description" fieldId="config-description">
              <TextArea
                id="config-description"
                data-testid="config-description-input"
                value={description}
                onChange={(_e, value) => setDescription(value)}
              />
            </FormGroup>
          </StackItem>
          {!isEditMode && !isDuplicateMode && (
            <StackItem>
              <ConfigSourceSelect
                value={configSource}
                onChange={(value, fileContent) => {
                  setConfigSource(value);
                  if (value === 'sample' && resolvedTopologyType) {
                    setYamlValue(getSampleYaml(resolvedTopologyType));
                  } else if (value === 'upload') {
                    setYamlValue(fileContent ?? '');
                  } else if (value === 'blank') {
                    setYamlValue('');
                  }
                }}
              />
            </StackItem>
          )}
          {(isEditMode ||
            isDuplicateMode ||
            (configSource != null && configSource !== 'upload')) && (
            <StackItem isFilled>
              <FormGroup label="LLMInferenceServiceConfig YAML" isRequired fieldId="config-yaml">
                <ConfigYAMLEditor value={yamlValue} onChange={setYamlValue} isReadOnly={false} />
              </FormGroup>
            </StackItem>
          )}
          {error && (
            <StackItem>
              <Alert
                isInline
                variant="danger"
                title={error.name}
                actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
          <StackItem>
            <ActionGroup>
              <Button
                variant="primary"
                data-testid="submit-topology-config-button"
                isDisabled={
                  !displayName ||
                  !yamlValue.trim() ||
                  loading ||
                  (!isEditMode && !isDuplicateMode && !configSource)
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
                onClick={() => navigate('..')}
              >
                Cancel
              </Button>
            </ActionGroup>
          </StackItem>
        </Stack>
      </Form>
    </ApplicationsPage>
  );
};

export default TopologyConfigurationCreateEdit;
