import React from 'react';
import {
  Form,
  FormGroup,
  FormSection,
  TextInput,
  Radio,
  Switch,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ExpandableSection,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import { FeatureStoreFormData, AuthzType, ScalingMode, VALID_CONCURRENCY_POLICIES } from '../types';

type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(propKey: K, propValue: T[K]) => void;

type AdvancedStepProps = {
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  namespaceConfigMaps: string[];
};

const AdvancedStep: React.FC<AdvancedStepProps> = ({ data, setData, namespaceConfigMaps }) => {
  const [cronExpanded, setCronExpanded] = React.useState(false);
  const [scalingExpanded, setScalingExpanded] = React.useState(false);
  const [batchEngineExpanded, setBatchEngineExpanded] = React.useState(false);
  const [pdbEnabled, setPdbEnabled] = React.useState(() => !!data.services?.podDisruptionBudgets);
  const [pdbMode, setPdbMode] = React.useState<'minAvailable' | 'maxUnavailable'>(() =>
    data.services?.podDisruptionBudgets?.maxUnavailable != null ? 'maxUnavailable' : 'minAvailable',
  );

  const concurrencyOptions = VALID_CONCURRENCY_POLICIES.map((p) => ({
    key: p,
    label: p,
  }));

  return (
    <Form>
      <FormSection title="Authorization">
        <FormGroup fieldId="feast-authz-type">
          <Radio
            id="authz-none"
            name="authz-type"
            label="None"
            isChecked={data.authzType === AuthzType.NONE}
            onChange={() => {
              setData('authzType', AuthzType.NONE);
              setData('authz', undefined);
            }}
          />
          <Radio
            id="authz-kubernetes"
            name="authz-type"
            label="Kubernetes RBAC"
            description="Use Kubernetes RBAC roles for authorization"
            isChecked={data.authzType === AuthzType.KUBERNETES}
            onChange={() => {
              setData('authzType', AuthzType.KUBERNETES);
              setData('authz', { kubernetes: { roles: [] } });
            }}
            className="pf-v6-u-mt-sm"
          />
          <Radio
            id="authz-oidc"
            name="authz-type"
            label="OIDC"
            description="Use OpenID Connect identity provider"
            isChecked={data.authzType === AuthzType.OIDC}
            onChange={() => {
              setData('authzType', AuthzType.OIDC);
              setData('authz', { oidc: { secretRef: { name: '' } } });
            }}
            className="pf-v6-u-mt-sm"
          />
        </FormGroup>

        {data.authzType === AuthzType.KUBERNETES && (
          <FormGroup label="Kubernetes roles" fieldId="feast-k8s-roles">
            <TextInput
              id="feast-k8s-roles"
              value={data.authz?.kubernetes?.roles?.join(', ') ?? ''}
              onChange={(_e, val) =>
                setData('authz', {
                  kubernetes: {
                    roles: val
                      .split(',')
                      .map((r) => r.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="role1, role2"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Comma-separated list of RBAC roles to be created in the namespace.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        )}

        {data.authzType === AuthzType.OIDC && (
          <FormGroup label="OIDC secret name" isRequired fieldId="feast-oidc-secret">
            <TextInput
              id="feast-oidc-secret"
              data-testid="feast-oidc-secret"
              value={data.authz?.oidc?.secretRef.name ?? ''}
              onChange={(_e, val) => setData('authz', { oidc: { secretRef: { name: val } } })}
              placeholder="oidc-secret"
            />
          </FormGroup>
        )}
      </FormSection>

      <ExpandableSection
        toggleText="Materialisation CronJob configuration"
        isExpanded={cronExpanded}
        onToggle={(_e, expanded) => setCronExpanded(expanded)}
      >
        <FormSection>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Configures a Kubernetes CronJob that runs &quot;feast apply&quot; and materialises
                feature data from offline to online stores on a recurring schedule.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          <FormGroup label="Schedule" fieldId="feast-cron-schedule">
            <TextInput
              id="feast-cron-schedule"
              value={data.cronJob?.schedule ?? ''}
              onChange={(_e, val) => setData('cronJob', { ...data.cronJob, schedule: val })}
              placeholder="@yearly (default)"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Cron format schedule. Default is @yearly.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Time zone" fieldId="feast-cron-timezone">
            <TextInput
              id="feast-cron-timezone"
              value={data.cronJob?.timeZone ?? ''}
              onChange={(_e, val) =>
                setData('cronJob', { ...data.cronJob, timeZone: val || undefined })
              }
              placeholder="UTC"
            />
          </FormGroup>

          <FormGroup label="Concurrency policy" fieldId="feast-cron-concurrency">
            <SimpleSelect
              dataTestId="feast-cron-concurrency"
              options={concurrencyOptions}
              value={data.cronJob?.concurrencyPolicy ?? ''}
              placeholder="Allow (default)"
              onChange={(key) => setData('cronJob', { ...data.cronJob, concurrencyPolicy: key })}
              isFullWidth
            />
          </FormGroup>

          <FormGroup fieldId="feast-cron-suspend">
            <Switch
              id="feast-cron-suspend"
              label="Suspend CronJob"
              isChecked={data.cronJob?.suspend ?? false}
              onChange={(_e, checked) => setData('cronJob', { ...data.cronJob, suspend: checked })}
            />
          </FormGroup>
        </FormSection>
      </ExpandableSection>

      <ExpandableSection
        toggleText="Scaling configuration"
        isExpanded={scalingExpanded}
        onToggle={(_e, expanded) => setScalingExpanded(expanded)}
      >
        <FormSection>
          <FormGroup fieldId="feast-scaling-enabled">
            <Switch
              id="feast-scaling-enabled"
              data-testid="feast-scaling-enabled"
              label="Enable scaling"
              isChecked={data.scalingEnabled}
              onChange={(_e, checked) => setData('scalingEnabled', checked)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Scaling above 1 replica requires DB-backed persistence for online/offline stores
                  and a DB-backed or remote registry.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {data.scalingEnabled && (
            <>
              <FormGroup label="Scaling mode" fieldId="feast-scaling-mode">
                <Radio
                  id="scaling-static"
                  name="scaling-mode"
                  label="Static replicas"
                  description="Set a fixed number of pod replicas"
                  isChecked={data.scalingMode === ScalingMode.STATIC}
                  onChange={() => setData('scalingMode', ScalingMode.STATIC)}
                />
                <Radio
                  id="scaling-hpa"
                  name="scaling-mode"
                  label="Horizontal Pod Autoscaler (HPA)"
                  description="Automatically scale pods based on CPU/memory metrics"
                  isChecked={data.scalingMode === ScalingMode.HPA}
                  onChange={() => setData('scalingMode', ScalingMode.HPA)}
                  className="pf-v6-u-mt-sm"
                />
              </FormGroup>

              {data.scalingMode === ScalingMode.STATIC && (
                <FormGroup label="Replicas" fieldId="feast-replicas">
                  <NumberInputWrapper
                    value={data.replicas}
                    min={1}
                    onChange={(val) => {
                      if (val != null && val >= 1) {
                        setData('replicas', val);
                      }
                    }}
                  />
                </FormGroup>
              )}

              {data.scalingMode === ScalingMode.HPA && (
                <>
                  <FormGroup label="Minimum replicas" fieldId="feast-hpa-min">
                    <NumberInputWrapper
                      value={data.hpaMinReplicas}
                      min={1}
                      onChange={(val) => {
                        if (val != null && val >= 1) {
                          setData('hpaMinReplicas', val);
                        }
                      }}
                    />
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>
                          Lower limit for the number of replicas. Defaults to 1.
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                  <FormGroup label="Maximum replicas" isRequired fieldId="feast-hpa-max">
                    <NumberInputWrapper
                      value={data.hpaMaxReplicas}
                      min={1}
                      onChange={(val) => {
                        if (val != null && val >= 1) {
                          setData('hpaMaxReplicas', val);
                        }
                      }}
                    />
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>
                          Upper limit for the number of replicas. Required.
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        The Feast operator creates a Kubernetes HPA that scales pods based on CPU
                        utilisation (default: 80%). Mutually exclusive with static replicas.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </>
              )}
            </>
          )}

          <FormGroup fieldId="feast-pdb-enabled">
            <Switch
              id="feast-pdb-enabled"
              label="Pod disruption budget"
              isChecked={pdbEnabled}
              onChange={(_e, checked) => {
                setPdbEnabled(checked);
                if (!checked) {
                  setData('services', { ...data.services, podDisruptionBudgets: undefined });
                } else {
                  setData('services', {
                    ...data.services,
                    podDisruptionBudgets: { minAvailable: 1 },
                  });
                }
              }}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Limits the number of pods that can be down simultaneously during voluntary
                  disruptions.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {pdbEnabled && (
            <>
              <FormGroup label="PDB mode" fieldId="feast-pdb-mode">
                <Radio
                  id="pdb-min-available"
                  name="pdb-mode"
                  label="Min available"
                  description="Minimum number of pods that must remain available"
                  isChecked={pdbMode === 'minAvailable'}
                  onChange={() => {
                    setPdbMode('minAvailable');
                    setData('services', {
                      ...data.services,
                      podDisruptionBudgets: { minAvailable: 1 },
                    });
                  }}
                />
                <Radio
                  id="pdb-max-unavailable"
                  name="pdb-mode"
                  label="Max unavailable"
                  description="Maximum number of pods that can be unavailable"
                  isChecked={pdbMode === 'maxUnavailable'}
                  onChange={() => {
                    setPdbMode('maxUnavailable');
                    setData('services', {
                      ...data.services,
                      podDisruptionBudgets: { maxUnavailable: 1 },
                    });
                  }}
                  className="pf-v6-u-mt-sm"
                />
              </FormGroup>
              <FormGroup
                label={pdbMode === 'minAvailable' ? 'Min available' : 'Max unavailable'}
                fieldId="feast-pdb-value"
              >
                <TextInput
                  id="feast-pdb-value"
                  value={
                    pdbMode === 'minAvailable'
                      ? String(data.services?.podDisruptionBudgets?.minAvailable ?? 1)
                      : String(data.services?.podDisruptionBudgets?.maxUnavailable ?? 1)
                  }
                  onChange={(_e, val) => {
                    const parsed = /^\d+%?$/.test(val.trim()) ? val.trim() : val;
                    const numVal = Number(parsed);
                    const finalVal =
                      !Number.isNaN(numVal) && !parsed.includes('%') ? numVal : parsed;
                    setData('services', {
                      ...data.services,
                      podDisruptionBudgets:
                        pdbMode === 'minAvailable'
                          ? { minAvailable: finalVal }
                          : { maxUnavailable: finalVal },
                    });
                  }}
                  placeholder="1 or 50%"
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Integer value or percentage (e.g. &quot;50%&quot;).
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </>
          )}
        </FormSection>
      </ExpandableSection>

      <ExpandableSection
        toggleText="Batch compute engine"
        isExpanded={batchEngineExpanded}
        onToggle={(_e, expanded) => setBatchEngineExpanded(expanded)}
      >
        <FormSection>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Configure a batch compute engine for materialisation jobs. The engine configuration
                is read from a ConfigMap in the target namespace. Supported types include Spark and
                Ray. Defaults to local if not configured.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          <FormGroup fieldId="feast-batch-engine-enabled">
            <Switch
              id="feast-batch-engine-enabled"
              label="Enable batch compute engine"
              isChecked={data.batchEngineEnabled}
              onChange={(_e, checked) => {
                setData('batchEngineEnabled', checked);
                if (!checked) {
                  setData('batchEngineConfigMapName', '');
                  setData('batchEngineConfigMapKey', '');
                }
              }}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  When disabled, Feast uses the default local in-process engine.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {data.batchEngineEnabled && (
            <>
              <FormGroup label="ConfigMap" isRequired fieldId="feast-batch-engine-configmap">
                <SimpleSelect
                  dataTestId="feast-batch-engine-configmap"
                  options={namespaceConfigMaps.map((name) => ({ key: name, label: name }))}
                  value={data.batchEngineConfigMapName}
                  placeholder="Select a ConfigMap"
                  onChange={(key) => setData('batchEngineConfigMapName', key)}
                  isFullWidth
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      The ConfigMap must contain YAML with a &quot;type&quot; field (e.g.
                      spark.engine, ray.engine) and engine-specific parameters.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>

              <FormGroup label="ConfigMap key" fieldId="feast-batch-engine-key">
                <TextInput
                  id="feast-batch-engine-key"
                  value={data.batchEngineConfigMapKey}
                  onChange={(_e, val) => setData('batchEngineConfigMapKey', val)}
                  placeholder="config (default)"
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Key within the ConfigMap that holds the engine configuration. Defaults to
                      &quot;config&quot; if left empty.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </>
          )}
        </FormSection>
      </ExpandableSection>

      <FormSection title="Init containers">
        <FormGroup fieldId="feast-disable-init-containers">
          <Switch
            id="feast-disable-init-containers"
            label="Disable init containers"
            isChecked={data.services?.disableInitContainers ?? false}
            onChange={(_e, checked) =>
              setData('services', { ...data.services, disableInitContainers: checked })
            }
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>Disable the feast repo initialization init container.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup fieldId="feast-run-apply-on-init">
          <Switch
            id="feast-run-apply-on-init"
            label="Run feast apply on init"
            isChecked={data.services?.runFeastApplyOnInit ?? true}
            onChange={(_e, checked) =>
              setData('services', { ...data.services, runFeastApplyOnInit: checked })
            }
          />
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default AdvancedStep;
