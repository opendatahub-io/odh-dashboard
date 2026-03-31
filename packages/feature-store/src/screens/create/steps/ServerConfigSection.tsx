import React from 'react';
import {
  FormGroup,
  FormSection,
  TextInput,
  Switch,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ExpandableSection,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import { FeastServerConfigs, FeastWorkerConfigs } from '@odh-dashboard/internal/k8sTypes';
import { VALID_LOG_LEVELS } from '../types';

type ServerConfigSectionProps = {
  title: string;
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

const getStr = (obj: unknown, key: string): string => {
  if (obj && typeof obj === 'object' && key in obj) {
    const val = (obj as Record<string, unknown>)[key]; // eslint-disable-line @typescript-eslint/consistent-type-assertions
    return typeof val === 'string' ? val : '';
  }
  return '';
};

const getResourceValues = (resources: Record<string, unknown> | undefined): ResourceValues => {
  if (!resources) {
    return { cpuRequest: '', cpuLimit: '', memoryRequest: '', memoryLimit: '' };
  }
  return {
    cpuRequest: getStr(resources.requests, 'cpu'),
    cpuLimit: getStr(resources.limits, 'cpu'),
    memoryRequest: getStr(resources.requests, 'memory'),
    memoryLimit: getStr(resources.limits, 'memory'),
  };
};

const buildResources = (vals: ResourceValues): Record<string, unknown> | undefined => {
  const requests: Record<string, string> = {};
  const limits: Record<string, string> = {};
  if (vals.cpuRequest) {
    requests.cpu = vals.cpuRequest;
  }
  if (vals.memoryRequest) {
    requests.memory = vals.memoryRequest;
  }
  if (vals.cpuLimit) {
    limits.cpu = vals.cpuLimit;
  }
  if (vals.memoryLimit) {
    limits.memory = vals.memoryLimit;
  }
  if (Object.keys(requests).length === 0 && Object.keys(limits).length === 0) {
    return undefined;
  }
  const res: Record<string, unknown> = {};
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
    update({ resources: buildResources(updated) });
  };

  return (
    <ExpandableSection
      toggleText={title}
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
    >
      <FormSection>
        <FormGroup label="Log level" fieldId={`${title}-log-level`}>
          <SimpleSelect
            dataTestId={`${title}-log-level`}
            options={logLevelOptions}
            value={config.logLevel ?? ''}
            placeholder="Default (operator)"
            onChange={(key) => update({ logLevel: key || undefined })}
            isFullWidth
          />
        </FormGroup>

        <FormGroup fieldId={`${title}-metrics`}>
          <Switch
            id={`${title}-metrics`}
            label="Prometheus metrics"
            isChecked={config.metrics ?? false}
            onChange={(_e, checked) => update({ metrics: checked || undefined })}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Expose Prometheus-compatible metrics endpoint for this server.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Container image" fieldId={`${title}-image`}>
          <TextInput
            id={`${title}-image`}
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

      {/* Inner expandables use conditional rendering to avoid PF v6 CSS
          variable cascade: expanded parent sets --MaxHeight/--Overflow/
          --Visibility which cascade to nested collapsed sections. */}
      <ExpandableSection
        toggleText="Resources (CPU / Memory)"
        isExpanded={resourcesExpanded}
        onToggle={(_e, val) => setResourcesExpanded(val)}
        isIndented
      >
        {resourcesExpanded ? (
          <FormSection>
            <FormGroup label="CPU request" fieldId={`${title}-cpu-request`}>
              <TextInput
                id={`${title}-cpu-request`}
                value={resourceVals.cpuRequest}
                onChange={(_e, val) => updateResource('cpuRequest', val)}
                placeholder="e.g. 100m, 0.5, 1"
              />
            </FormGroup>
            <FormGroup label="CPU limit" fieldId={`${title}-cpu-limit`}>
              <TextInput
                id={`${title}-cpu-limit`}
                value={resourceVals.cpuLimit}
                onChange={(_e, val) => updateResource('cpuLimit', val)}
                placeholder="e.g. 500m, 1, 2"
              />
            </FormGroup>
            <FormGroup label="Memory request" fieldId={`${title}-memory-request`}>
              <TextInput
                id={`${title}-memory-request`}
                value={resourceVals.memoryRequest}
                onChange={(_e, val) => updateResource('memoryRequest', val)}
                placeholder="e.g. 128Mi, 256Mi, 1Gi"
              />
            </FormGroup>
            <FormGroup label="Memory limit" fieldId={`${title}-memory-limit`}>
              <TextInput
                id={`${title}-memory-limit`}
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
                  Gunicorn worker settings for production deployments. Leave empty for operator
                  defaults.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <FormGroup label="Workers" fieldId={`${title}-workers`}>
              <NumberInputWrapper
                min={-1}
                value={worker.workers ?? 1}
                onChange={(v) => updateWorker({ workers: v })}
                data-testid={`${title}-workers`}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Number of worker processes. Use -1 to auto-calculate based on CPU cores.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Worker connections" fieldId={`${title}-worker-connections`}>
              <NumberInputWrapper
                min={1}
                value={worker.workerConnections ?? 1000}
                onChange={(v) => updateWorker({ workerConnections: v })}
                data-testid={`${title}-worker-connections`}
              />
            </FormGroup>
            <FormGroup label="Max requests" fieldId={`${title}-max-requests`}>
              <NumberInputWrapper
                min={0}
                value={worker.maxRequests ?? 1000}
                onChange={(v) => updateWorker({ maxRequests: v })}
                data-testid={`${title}-max-requests`}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Maximum requests a worker processes before restarting (prevents memory leaks).
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Max requests jitter" fieldId={`${title}-max-requests-jitter`}>
              <NumberInputWrapper
                min={0}
                value={worker.maxRequestsJitter ?? 50}
                onChange={(v) => updateWorker({ maxRequestsJitter: v })}
                data-testid={`${title}-max-requests-jitter`}
              />
            </FormGroup>
            <FormGroup label="Keep-alive timeout (seconds)" fieldId={`${title}-keep-alive`}>
              <NumberInputWrapper
                min={1}
                value={worker.keepAliveTimeout ?? 30}
                onChange={(v) => updateWorker({ keepAliveTimeout: v })}
                data-testid={`${title}-keep-alive`}
              />
            </FormGroup>
            {showRegistryTTL && (
              <FormGroup
                label="Server registry refresh interval (seconds)"
                fieldId={`${title}-registry-ttl`}
              >
                <NumberInputWrapper
                  min={0}
                  value={worker.registryTTLSeconds ?? 60}
                  onChange={(v) => updateWorker({ registryTTLSeconds: v })}
                  data-testid={`${title}-registry-ttl`}
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
