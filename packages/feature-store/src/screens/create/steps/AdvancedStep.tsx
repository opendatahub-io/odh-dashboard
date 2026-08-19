import React from 'react';
import {
  Alert,
  ExpandableSection,
  Form,
  FormGroup,
  Radio,
  Stack,
  StackItem,
  Switch,
  TextInput,
} from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/ui-core/components/NumberInputWrapper';
import { FeatureStoreFormData, AuthzType, ScalingMode, VALID_CONCURRENCY_POLICIES } from '../types';
import { needsMultiReplicaWarning } from '../validationUtils';
import { FeastAuthzConfig, FeastCronJob } from '../../../k8sTypes';

type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(propKey: K, propValue: T[K]) => void;

const selectToggleStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
};

const bodyPortalPopperProps = { appendTo: () => document.body };

type AdvancedStepProps = {
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  namespaceSecrets: string[];
  namespaceConfigMaps: string[];
};

const AuthzSection: React.FC<{
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  namespaceSecrets: string[];
}> = ({ data, setData, namespaceSecrets }) => {
  const [expanded, setExpanded] = React.useState(data.authzType !== AuthzType.NONE);

  const updateAuthz = (patch: Partial<FeastAuthzConfig>) => {
    setData('authz', { ...data.authz, ...patch });
  };

  return (
    <ExpandableSection
      toggleText="Authorization"
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
      data-testid="authz-section"
    >
      <Stack hasGutter>
        <StackItem>
          <FormGroup label="Authorization type" fieldId="authz-type" role="radiogroup">
            <Stack hasGutter>
              <StackItem>
                <Radio
                  id="authz-kubernetes"
                  name="authz-type"
                  label="Kubernetes RBAC"
                  description="Enforces access control using Kubernetes RBAC and feature store permissions."
                  isChecked={data.authzType === AuthzType.KUBERNETES}
                  onChange={() => {
                    setData('authzType', AuthzType.KUBERNETES);
                    updateAuthz({ kubernetes: { roles: [] }, oidc: undefined });
                  }}
                />
              </StackItem>
              <StackItem>
                <Radio
                  id="authz-oidc"
                  name="authz-type"
                  label="OIDC"
                  description="Restricts access to users authenticated through an OpenID Connect identity provider."
                  isChecked={data.authzType === AuthzType.OIDC}
                  onChange={() => {
                    setData('authzType', AuthzType.OIDC);
                    updateAuthz({ kubernetes: undefined, oidc: { secretRef: { name: '' } } });
                  }}
                />
              </StackItem>
              <StackItem>
                <Radio
                  id="authz-none"
                  name="authz-type"
                  label="No authorization"
                  description="Allows unrestricted access to the feature store. Use only for development and testing."
                  isChecked={data.authzType === AuthzType.NONE}
                  onChange={() => {
                    setData('authzType', AuthzType.NONE);
                    setData('authz', undefined);
                  }}
                />
              </StackItem>
            </Stack>
          </FormGroup>
        </StackItem>

        {data.authzType === AuthzType.OIDC && (
          <StackItem>
            <FormGroup label="OIDC secret" fieldId="authz-oidc-secret" isRequired>
              <SimpleSelect
                dataTestId="authz-oidc-secret"
                isScrollable
                isFullWidth
                options={namespaceSecrets.map((s) => ({ key: s, label: s }))}
                value={data.authz?.oidc?.secretRef?.name ?? ''}
                onChange={(val) => updateAuthz({ oidc: { secretRef: { name: val } } })}
                placeholder="Select a secret"
                toggleProps={{ style: selectToggleStyle }}
                popperProps={bodyPortalPopperProps}
              />
            </FormGroup>
          </StackItem>
        )}
      </Stack>
    </ExpandableSection>
  );
};

const ScalingSection: React.FC<{
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
}> = ({ data, setData }) => {
  const [expanded, setExpanded] = React.useState(data.scalingEnabled);
  const showWarning = data.scalingEnabled && needsMultiReplicaWarning(data);

  return (
    <ExpandableSection
      toggleText="Scaling"
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
      data-testid="scaling-section"
    >
      <Stack hasGutter>
        <StackItem>
          <FormGroup fieldId="scaling-toggle">
            <Switch
              id="scaling-toggle"
              label="Enable replica scaling"
              isChecked={data.scalingEnabled}
              onChange={(_e, checked) => setData('scalingEnabled', checked)}
              data-testid="scaling-toggle"
            />
          </FormGroup>
        </StackItem>

        {data.scalingEnabled && (
          <>
            <StackItem>
              <FormGroup label="Scaling mode" fieldId="scaling-mode">
                <Radio
                  id="scaling-static"
                  name="scaling-mode"
                  label="Static replica count"
                  isChecked={data.scalingMode === ScalingMode.STATIC}
                  onChange={() => setData('scalingMode', ScalingMode.STATIC)}
                />
                <Radio
                  id="scaling-hpa"
                  name="scaling-mode"
                  label="Horizontal Pod Autoscaler (HPA)"
                  isChecked={data.scalingMode === ScalingMode.HPA}
                  onChange={() => setData('scalingMode', ScalingMode.HPA)}
                />
              </FormGroup>
            </StackItem>

            {data.scalingMode === ScalingMode.STATIC && (
              <StackItem>
                <FormGroup label="Replicas" fieldId="scaling-replicas">
                  <NumberInputWrapper
                    data-testid="scaling-replicas"
                    value={data.replicas}
                    onChange={(val) => setData('replicas', Math.max(1, val ?? 1))}
                    min={1}
                  />
                </FormGroup>
              </StackItem>
            )}

            {data.scalingMode === ScalingMode.HPA && (
              <>
                <StackItem>
                  <FormGroup label="Minimum replicas" fieldId="scaling-hpa-min">
                    <NumberInputWrapper
                      data-testid="scaling-hpa-min"
                      value={data.hpaMinReplicas}
                      onChange={(val) => setData('hpaMinReplicas', Math.max(1, val ?? 1))}
                      min={1}
                    />
                  </FormGroup>
                </StackItem>
                <StackItem>
                  <FormGroup label="Maximum replicas" fieldId="scaling-hpa-max">
                    <NumberInputWrapper
                      data-testid="scaling-hpa-max"
                      value={data.hpaMaxReplicas}
                      onChange={(val) => setData('hpaMaxReplicas', Math.max(1, val ?? 1))}
                      min={1}
                    />
                  </FormGroup>
                </StackItem>
              </>
            )}

            {showWarning && (
              <StackItem>
                <Alert
                  variant="warning"
                  isInline
                  title="File-based persistence is not compatible with multi-replica scaling"
                  data-testid="scaling-persistence-warning"
                >
                  Multi-replica scaling requires database-backed persistence. File-based storage
                  cannot be shared across replicas.
                </Alert>
              </StackItem>
            )}
          </>
        )}
      </Stack>
    </ExpandableSection>
  );
};

const CronJobSection: React.FC<{
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
}> = ({ data, setData }) => {
  const hasCronJob = !!data.cronJob?.schedule;
  const [expanded, setExpanded] = React.useState(hasCronJob);

  const updateCronJob = (patch: Partial<FeastCronJob>) => {
    setData('cronJob', { ...data.cronJob, ...patch });
  };

  return (
    <ExpandableSection
      toggleText="Cron job"
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
      data-testid="cronjob-section"
    >
      <Stack hasGutter>
        <StackItem>
          <FormGroup label="Schedule (cron expression)" fieldId="cronjob-schedule">
            <TextInput
              id="cronjob-schedule"
              value={data.cronJob?.schedule ?? ''}
              onChange={(_e, val) => updateCronJob({ schedule: val || undefined })}
              placeholder="0 */6 * * *"
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <FormGroup label="Timezone" fieldId="cronjob-timezone">
            <TextInput
              id="cronjob-timezone"
              value={data.cronJob?.timeZone ?? ''}
              onChange={(_e, val) => updateCronJob({ timeZone: val || undefined })}
              placeholder="UTC"
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <FormGroup label="Concurrency policy" fieldId="cronjob-concurrency">
            <SimpleSelect
              dataTestId="cronjob-concurrency"
              isScrollable
              isFullWidth
              options={VALID_CONCURRENCY_POLICIES.map((p) => ({ key: p, label: p }))}
              value={data.cronJob?.concurrencyPolicy ?? ''}
              onChange={(val) => updateCronJob({ concurrencyPolicy: val || undefined })}
              placeholder="Select concurrency policy"
              toggleProps={{ style: selectToggleStyle }}
              popperProps={bodyPortalPopperProps}
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <FormGroup label="Successful jobs history limit" fieldId="cronjob-success-limit">
            <NumberInputWrapper
              data-testid="cronjob-success-limit"
              value={data.cronJob?.successfulJobsHistoryLimit ?? 3}
              onChange={(val) =>
                updateCronJob({ successfulJobsHistoryLimit: Math.max(0, val ?? 0) })
              }
              min={0}
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <FormGroup label="Failed jobs history limit" fieldId="cronjob-fail-limit">
            <NumberInputWrapper
              data-testid="cronjob-fail-limit"
              value={data.cronJob?.failedJobsHistoryLimit ?? 1}
              onChange={(val) => updateCronJob({ failedJobsHistoryLimit: Math.max(0, val ?? 0) })}
              min={0}
            />
          </FormGroup>
        </StackItem>
      </Stack>
    </ExpandableSection>
  );
};

const BatchEngineSection: React.FC<{
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  namespaceConfigMaps: string[];
}> = ({ data, setData, namespaceConfigMaps }) => {
  const [expanded, setExpanded] = React.useState(data.batchEngineEnabled);

  return (
    <ExpandableSection
      toggleText="Batch compute engine"
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
      data-testid="batch-engine-section"
    >
      <Stack hasGutter>
        <StackItem>
          <FormGroup fieldId="batch-engine-toggle">
            <Switch
              id="batch-engine-toggle"
              label="Enable batch compute engine"
              isChecked={data.batchEngineEnabled}
              onChange={(_e, checked) => setData('batchEngineEnabled', checked)}
              data-testid="batch-engine-toggle"
            />
          </FormGroup>
        </StackItem>

        {data.batchEngineEnabled && (
          <>
            <StackItem>
              <FormGroup label="ConfigMap" fieldId="batch-engine-configmap" isRequired>
                <SimpleSelect
                  dataTestId="batch-engine-configmap"
                  isScrollable
                  isFullWidth
                  options={namespaceConfigMaps.map((cm) => ({ key: cm, label: cm }))}
                  value={data.batchEngineConfigMapName}
                  onChange={(val) => setData('batchEngineConfigMapName', val)}
                  placeholder="Select a ConfigMap"
                  toggleProps={{ style: selectToggleStyle }}
                  popperProps={bodyPortalPopperProps}
                />
              </FormGroup>
            </StackItem>
            <StackItem>
              <FormGroup label="ConfigMap key" fieldId="batch-engine-configmap-key">
                <TextInput
                  id="batch-engine-configmap-key"
                  value={data.batchEngineConfigMapKey}
                  onChange={(_e, val) => setData('batchEngineConfigMapKey', val)}
                  placeholder="config.yaml"
                />
              </FormGroup>
            </StackItem>
          </>
        )}
      </Stack>
    </ExpandableSection>
  );
};

const MiscSection: React.FC<{
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
}> = ({ data, setData }) => {
  const [expanded, setExpanded] = React.useState(false);

  const disableInitContainers = data.services?.disableInitContainers ?? false;
  const runFeastApplyOnInit = data.services?.runFeastApplyOnInit ?? true;
  const hasPDB = !!data.services?.podDisruptionBudgets;

  return (
    <ExpandableSection
      toggleText="Miscellaneous"
      isExpanded={expanded}
      onToggle={(_e, val) => setExpanded(val)}
      data-testid="misc-section"
    >
      <Stack hasGutter>
        <StackItem>
          <FormGroup fieldId="misc-init-containers">
            <Switch
              id="misc-init-containers"
              label="Disable init containers"
              isChecked={disableInitContainers}
              onChange={(_e, checked) =>
                setData('services', {
                  ...data.services,
                  disableInitContainers: checked || undefined,
                })
              }
              data-testid="misc-init-containers"
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <FormGroup fieldId="misc-feast-apply">
            <Switch
              id="misc-feast-apply"
              label="Run Feast apply on init"
              isChecked={runFeastApplyOnInit}
              onChange={(_e, checked) =>
                setData('services', {
                  ...data.services,
                  runFeastApplyOnInit: checked ? undefined : false,
                })
              }
              data-testid="misc-feast-apply"
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <FormGroup fieldId="misc-pdb">
            <Switch
              id="misc-pdb"
              label="Enable Pod Disruption Budget"
              isChecked={hasPDB}
              onChange={(_e, checked) =>
                setData('services', {
                  ...data.services,
                  podDisruptionBudgets: checked ? { minAvailable: 1 } : undefined,
                })
              }
              data-testid="misc-pdb"
            />
          </FormGroup>
        </StackItem>
      </Stack>
    </ExpandableSection>
  );
};

const AdvancedStep: React.FC<AdvancedStepProps> = ({
  data,
  setData,
  namespaceSecrets,
  namespaceConfigMaps,
}) => (
  <Form maxWidth="750px">
    <FormSection title="Advanced options" titleElement="h3">
      <AuthzSection data={data} setData={setData} namespaceSecrets={namespaceSecrets} />
      <ScalingSection data={data} setData={setData} />
      <CronJobSection data={data} setData={setData} />
      <BatchEngineSection data={data} setData={setData} namespaceConfigMaps={namespaceConfigMaps} />
      <MiscSection data={data} setData={setData} />
    </FormSection>
  </Form>
);

export default AdvancedStep;
