import React from 'react';
import {
  FormGroup,
  TextInput,
  Switch,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ExpandableSection,
} from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/ui-core/components/NumberInputWrapper';
import { FeastServerConfigs, FeastWorkerConfigs } from '../../../k8sTypes';
import { VALID_LOG_LEVELS } from '../types';

type ServerConfigSectionProps = {
  title: string;
  idPrefix: string;
  serverConfig: FeastServerConfigs | undefined;
  onChange: (config: FeastServerConfigs) => void;
  showRegistryTTL?: boolean;
};

type ResourceValues = {
  cpuRequest: string;
  cpuLimit: string;
  memoryRequest: string;
  memoryLimit: string;
};

const getResourceValues = (
  resources: { requests?: Record<string, string>; limits?: Record<string, string> } | undefined,
): ResourceValues => {
  if (!resources) {
    return { cpuRequest: '', cpuLimit: '', memoryRequest: '', memoryLimit: '' };
  }
  return {
    cpuRequest: resources.requests?.cpu ?? '',
    cpuLimit: resources.limits?.cpu ?? '',
    memoryRequest: resources.requests?.memory ?? '',
    memoryLimit: resources.limits?.memory ?? '',
  };
};

const buildResources = (
  vals: ResourceValues,
  existing: { requests?: Record<string, string>; limits?: Record<string, string> } | undefined,
): { requests?: Record<string, string>; limits?: Record<string, string> } | undefined => {
  const requests: Record<string, string> = { ...existing?.requests };
  const limits: Record<string, string> = { ...existing?.limits };
  if (vals.cpuRequest) {
    requests.cpu = vals.cpuRequest;
  } else {
    delete requests.cpu;
  }
  if (vals.memoryRequest) {
    requests.memory = vals.memoryRequest;
  } else {
    delete requests.memory;
  }
  if (vals.cpuLimit) {
    limits.cpu = vals.cpuLimit;
  } else {
    delete limits.cpu;
  }
  if (vals.memoryLimit) {
    limits.memory = vals.memoryLimit;
  } else {
    delete limits.memory;
  }
  if (Object.keys(requests).length === 0 && Object.keys(limits).length === 0) {
    return undefined;
  }
  const res: { requests?: Record<string, string>; limits?: Record<string, string> } = {};
  if (Object.keys(requests).length > 0) {
    res.requests = requests;
  }
  if (Object.keys(limits).length > 0) {
    res.limits = limits;
  }
  return res;
};

const logLevelOptions = VALID_LOG_LEVELS.map((l) => ({ key: l, label: l }));

const ServerConfigSection: React.FC<ServerConfigSectionProps> = ({
  title,
  idPrefix,
  serverConfig,
  onChange,
  showRegistryTTL = false,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [workerExpanded, setWorkerExpanded] = React.useState(false);
  const [resourcesExpanded, setResourcesExpanded] = React.useState(false);

  const config = serverConfig ?? {};
  const worker = config.workerConfigs ?? {};
  const resourceVals = getResourceValues(config.resources);

  const update = (patch: Partial<FeastServerConfigs>) => {
    onChange({ ...config, ...patch });
  };

  const updateWorker = (patch: Partial<FeastWorkerConfigs>) => {
    update({ workerConfigs: { ...worker, ...patch } });
  };

  const updateResource = (field: keyof ResourceValues, value: string) => {
    const updated = { ...resourceVals, [field]: value };
    update({ resources: buildResources(updated, config.resources) });
  };

  return (
    <ExpandableSection
      toggleText={title}
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
    >
      <FormSection>
        <FormGroup label="Log level" fieldId={`${idPrefix}-log-level`}>
          <SimpleSelect
            dataTestId={`${idPrefix}-log-level`}
            options={logLevelOptions}
            value={config.logLevel ?? ''}
            placeholder="Default (operator)"
            onChange={(key) => update({ logLevel: key || undefined })}
            isScrollable
            isFullWidth
          />
        </FormGroup>

        <FormGroup fieldId={`${idPrefix}-metrics`}>
          <Switch
            id={`${idPrefix}-metrics`}
            label="Prometheus metrics"
            isChecked={config.metrics ?? false}
            onChange={(_e, checked) => update({ metrics: checked || undefined })}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Exposes a Prometheus-compatible metrics endpoint for this server.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Container image" fieldId={`${idPrefix}-image`}>
          <TextInput
            id={`${idPrefix}-image`}
            value={config.image ?? ''}
            onChange={(_e, val) => update({ image: val || undefined })}
            placeholder="Leave empty for operator default"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Custom container image override. Only set if you need a specific version.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>

      <ExpandableSection
        toggleText="Resources (CPU / Memory)"
        isExpanded={resourcesExpanded}
        onToggle={(_e, val) => setResourcesExpanded(val)}
        isIndented
      >
        {resourcesExpanded ? (
          <FormSection>
            <FormGroup label="CPU request" fieldId={`${idPrefix}-cpu-request`}>
              <TextInput
                id={`${idPrefix}-cpu-request`}
                value={resourceVals.cpuRequest}
                onChange={(_e, val) => updateResource('cpuRequest', val)}
                placeholder="e.g. 100m, 0.5, 1"
              />
            </FormGroup>
            <FormGroup label="CPU limit" fieldId={`${idPrefix}-cpu-limit`}>
              <TextInput
                id={`${idPrefix}-cpu-limit`}
                value={resourceVals.cpuLimit}
                onChange={(_e, val) => updateResource('cpuLimit', val)}
                placeholder="e.g. 500m, 1, 2"
              />
            </FormGroup>
            <FormGroup label="Memory request" fieldId={`${idPrefix}-memory-request`}>
              <TextInput
                id={`${idPrefix}-memory-request`}
                value={resourceVals.memoryRequest}
                onChange={(_e, val) => updateResource('memoryRequest', val)}
                placeholder="e.g. 128Mi, 256Mi, 1Gi"
              />
            </FormGroup>
            <FormGroup label="Memory limit" fieldId={`${idPrefix}-memory-limit`}>
              <TextInput
                id={`${idPrefix}-memory-limit`}
                value={resourceVals.memoryLimit}
                onChange={(_e, val) => updateResource('memoryLimit', val)}
                placeholder="e.g. 256Mi, 512Mi, 2Gi"
              />
            </FormGroup>
          </FormSection>
        ) : null}
      </ExpandableSection>

      <ExpandableSection
        toggleText="Worker configuration"
        isExpanded={workerExpanded}
        onToggle={(_e, val) => setWorkerExpanded(val)}
        isIndented
      >
        {workerExpanded ? (
          <FormSection>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Gunicorn worker settings for production deployments. Displayed values are upstream
                  defaults.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <FormGroup label="Workers" fieldId={`${idPrefix}-workers`}>
              <NumberInputWrapper
                min={-1}
                value={worker.workers ?? 1}
                onChange={(v) => updateWorker({ workers: v })}
                data-testid={`${idPrefix}-workers`}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Number of worker processes. Use -1 to auto-calculate based on CPU cores.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Worker connections" fieldId={`${idPrefix}-worker-connections`}>
              <NumberInputWrapper
                min={1}
                value={worker.workerConnections ?? 1000}
                onChange={(v) => updateWorker({ workerConnections: v })}
                data-testid={`${idPrefix}-worker-connections`}
              />
            </FormGroup>
            <FormGroup label="Max requests" fieldId={`${idPrefix}-max-requests`}>
              <NumberInputWrapper
                min={0}
                value={worker.maxRequests ?? 1000}
                onChange={(v) => updateWorker({ maxRequests: v })}
                data-testid={`${idPrefix}-max-requests`}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Maximum requests a worker processes before restarting (prevents memory leaks).
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Max requests jitter" fieldId={`${idPrefix}-max-requests-jitter`}>
              <NumberInputWrapper
                min={0}
                value={worker.maxRequestsJitter ?? 50}
                onChange={(v) => updateWorker({ maxRequestsJitter: v })}
                data-testid={`${idPrefix}-max-requests-jitter`}
              />
            </FormGroup>
            <FormGroup label="Keep-alive timeout (seconds)" fieldId={`${idPrefix}-keep-alive`}>
              <NumberInputWrapper
                min={1}
                value={worker.keepAliveTimeout ?? 30}
                onChange={(v) => updateWorker({ keepAliveTimeout: v })}
                data-testid={`${idPrefix}-keep-alive`}
              />
            </FormGroup>
            {showRegistryTTL && (
              <FormGroup
                label="Server registry refresh interval (seconds)"
                fieldId={`${idPrefix}-registry-ttl`}
              >
                <NumberInputWrapper
                  min={0}
                  value={worker.registryTTLSeconds ?? 60}
                  onChange={(v) => updateWorker({ registryTTLSeconds: v })}
                  data-testid={`${idPrefix}-registry-ttl`}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      How often the server process refreshes its in-memory registry data. Higher
                      values reduce overhead but increase staleness. Defaults to 60.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            )}
          </FormSection>
        ) : null}
      </ExpandableSection>
    </ExpandableSection>
  );
};

export default ServerConfigSection;
