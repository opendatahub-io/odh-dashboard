import React from 'react';
import {
  Form,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  CodeBlock,
  CodeBlockCode,
  FormSection,
} from '@patternfly/react-core';
import { FeastServerConfigs, FeastPvcConfig } from '@odh-dashboard/internal/k8sTypes';
import {
  FeatureStoreFormData,
  RegistryType,
  PersistenceType,
  AuthzType,
  ProjectDirType,
  RemoteRegistryType,
  ScalingMode,
} from '../types';
import { buildFormSpec, formSpecToYaml } from '../utils';

type ReviewStepProps = {
  data: FeatureStoreFormData;
  isFirstProject: boolean;
};

const hasServerConfig = (config: FeastServerConfigs | undefined): boolean => {
  if (!config) {
    return false;
  }
  return !!(
    config.logLevel ||
    config.metrics ||
    config.image ||
    config.resources ||
    config.workerConfigs
  );
};

const summarizeServerConfig = (config: FeastServerConfigs | undefined): string => {
  if (!config) {
    return 'Default';
  }
  const parts: string[] = [];
  if (config.logLevel) {
    parts.push(`log: ${config.logLevel}`);
  }
  if (config.metrics) {
    parts.push('metrics');
  }
  if (config.image) {
    parts.push('custom image');
  }
  if (config.resources) {
    parts.push('custom resources');
  }
  if (config.workerConfigs) {
    parts.push('custom workers');
  }
  return parts.length > 0 ? parts.join(', ') : 'Default';
};

const summarizePvc = (pvc: FeastPvcConfig | undefined): string | undefined => {
  if (!pvc) {
    return undefined;
  }
  if (pvc.ref) {
    return `Existing PVC: ${pvc.ref.name} at ${pvc.mountPath}`;
  }
  if (pvc.create) {
    const size = pvc.create.resources?.requests?.storage ?? 'default';
    return `New PVC (${size}) at ${pvc.mountPath}`;
  }
  return undefined;
};

const ReviewStep: React.FC<ReviewStepProps> = ({ data, isFirstProject }) => {
  const formSpec = buildFormSpec(data, isFirstProject);
  const yamlPreview = formSpecToYaml(formSpec);

  return (
    <Form>
      <FormSection title="Summary">
        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Name</DescriptionListTerm>
            <DescriptionListDescription>{data.feastProject}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Namespace</DescriptionListTerm>
            <DescriptionListDescription>{data.namespace}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Feast directory</DescriptionListTerm>
            <DescriptionListDescription>
              {data.projectDirType === ProjectDirType.NONE
                ? 'Default (operator managed)'
                : data.projectDirType === ProjectDirType.INIT
                ? `Feast init${
                    data.feastProjectDir?.init?.template
                      ? ` (${data.feastProjectDir.init.template})`
                      : ''
                  }`
                : `Git: ${data.feastProjectDir?.git?.url ?? ''}`}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {data.gitSecretName && (
            <DescriptionListGroup>
              <DescriptionListTerm>Git credentials secret</DescriptionListTerm>
              <DescriptionListDescription>{data.gitSecretName}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      </FormSection>

      <FormSection title="Registry">
        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Type</DescriptionListTerm>
            <DescriptionListDescription>
              {data.registryType === RegistryType.LOCAL ? 'Local' : 'Remote'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {data.registryType === RegistryType.LOCAL && (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>REST API</DescriptionListTerm>
                <DescriptionListDescription>
                  {data.services?.registry?.local?.server?.restAPI !== false
                    ? 'Enabled'
                    : 'Disabled'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>gRPC</DescriptionListTerm>
                <DescriptionListDescription>
                  {data.services?.registry?.local?.server?.grpc !== false ? 'Enabled' : 'Disabled'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Persistence</DescriptionListTerm>
                <DescriptionListDescription>
                  {data.registryPersistenceType === PersistenceType.FILE
                    ? 'File-based'
                    : 'Database'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {data.registryPersistenceType === PersistenceType.FILE &&
                summarizePvc(data.services?.registry?.local?.persistence?.file?.pvc) && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Registry PVC</DescriptionListTerm>
                    <DescriptionListDescription>
                      {summarizePvc(data.services?.registry?.local?.persistence?.file?.pvc)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              {data.registryPersistenceType === PersistenceType.FILE &&
                (data.services?.registry?.local?.persistence?.file?.cache_ttl_seconds ||
                  data.services?.registry?.local?.persistence?.file?.cache_mode) && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>File cache</DescriptionListTerm>
                    <DescriptionListDescription>
                      {[
                        data.services.registry.local.persistence.file.cache_ttl_seconds
                          ? `TTL: ${String(
                              data.services.registry.local.persistence.file.cache_ttl_seconds,
                            )}s`
                          : null,
                        data.services.registry.local.persistence.file.cache_mode
                          ? `Strategy: ${data.services.registry.local.persistence.file.cache_mode}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
            </>
          )}
          {data.registryType === RegistryType.REMOTE && (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Target</DescriptionListTerm>
                <DescriptionListDescription>
                  {data.remoteRegistryType === RemoteRegistryType.FEAST_REF
                    ? `FeatureStore: ${data.services?.registry?.remote?.feastRef?.name ?? ''}`
                    : `Hostname: ${data.services?.registry?.remote?.hostname ?? ''}`}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {data.remoteRegistryType === RemoteRegistryType.HOSTNAME &&
                data.services?.registry?.remote?.tls && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>TLS</DescriptionListTerm>
                    <DescriptionListDescription>
                      ConfigMap: {data.services.registry.remote.tls.configMapRef.name || '(none)'},
                      key: {data.services.registry.remote.tls.certName || '(none)'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
            </>
          )}
        </DescriptionList>
      </FormSection>

      <FormSection title="Stores">
        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Online store</DescriptionListTerm>
            <DescriptionListDescription>
              {data.onlineStoreEnabled
                ? `Enabled (${
                    data.onlinePersistenceType === PersistenceType.FILE ? 'file' : 'database'
                  })`
                : 'Disabled'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {data.onlineStoreEnabled &&
            data.onlinePersistenceType === PersistenceType.FILE &&
            summarizePvc(data.services?.onlineStore?.persistence?.file?.pvc) && (
              <DescriptionListGroup>
                <DescriptionListTerm>Online store PVC</DescriptionListTerm>
                <DescriptionListDescription>
                  {summarizePvc(data.services?.onlineStore?.persistence?.file?.pvc)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
          <DescriptionListGroup>
            <DescriptionListTerm>Offline store</DescriptionListTerm>
            <DescriptionListDescription>
              {data.offlineStoreEnabled
                ? `Enabled (${
                    data.offlinePersistenceType === PersistenceType.FILE ? 'file' : 'database'
                  })`
                : 'Disabled'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {data.offlineStoreEnabled &&
            data.offlinePersistenceType === PersistenceType.FILE &&
            summarizePvc(data.services?.offlineStore?.persistence?.file?.pvc) && (
              <DescriptionListGroup>
                <DescriptionListTerm>Offline store PVC</DescriptionListTerm>
                <DescriptionListDescription>
                  {summarizePvc(data.services?.offlineStore?.persistence?.file?.pvc)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
        </DescriptionList>
      </FormSection>

      <FormSection title="Advanced">
        <DescriptionList isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Authorization</DescriptionListTerm>
            <DescriptionListDescription>
              {data.authzType === AuthzType.NONE
                ? 'None'
                : data.authzType === AuthzType.KUBERNETES
                ? 'Kubernetes RBAC'
                : 'OIDC'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {data.scalingEnabled && (
            <DescriptionListGroup>
              <DescriptionListTerm>Scaling</DescriptionListTerm>
              <DescriptionListDescription>
                {data.scalingMode === ScalingMode.STATIC
                  ? `Static: ${data.replicas} replica(s)`
                  : `HPA: ${data.hpaMinReplicas}-${data.hpaMaxReplicas} replicas`}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          <DescriptionListGroup>
            <DescriptionListTerm>Batch compute engine</DescriptionListTerm>
            <DescriptionListDescription>
              {data.batchEngineEnabled && data.batchEngineConfigMapName
                ? `ConfigMap: ${data.batchEngineConfigMapName}${
                    data.batchEngineConfigMapKey ? ` (key: ${data.batchEngineConfigMapKey})` : ''
                  }`
                : 'Default (local)'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {data.services?.podDisruptionBudgets && (
            <DescriptionListGroup>
              <DescriptionListTerm>Pod disruption budget</DescriptionListTerm>
              <DescriptionListDescription>
                {data.services.podDisruptionBudgets.minAvailable != null
                  ? `Min available: ${String(data.services.podDisruptionBudgets.minAvailable)}`
                  : `Max unavailable: ${String(
                      data.services.podDisruptionBudgets.maxUnavailable ?? '',
                    )}`}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {data.onlineStoreEnabled && hasServerConfig(data.services?.onlineStore?.server) && (
            <DescriptionListGroup>
              <DescriptionListTerm>Online store server</DescriptionListTerm>
              <DescriptionListDescription>
                {summarizeServerConfig(data.services?.onlineStore?.server)}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {data.offlineStoreEnabled && hasServerConfig(data.services?.offlineStore?.server) && (
            <DescriptionListGroup>
              <DescriptionListTerm>Offline store server</DescriptionListTerm>
              <DescriptionListDescription>
                {summarizeServerConfig(data.services?.offlineStore?.server)}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {data.registryType === RegistryType.LOCAL &&
            hasServerConfig(data.services?.registry?.local?.server) && (
              <DescriptionListGroup>
                <DescriptionListTerm>Registry server</DescriptionListTerm>
                <DescriptionListDescription>
                  {summarizeServerConfig(data.services?.registry?.local?.server)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
        </DescriptionList>
      </FormSection>

      <FormSection title="YAML preview">
        <CodeBlock>
          <CodeBlockCode id="feast-yaml-preview" data-testid="feast-yaml-preview">
            {yamlPreview}
          </CodeBlockCode>
        </CodeBlock>
      </FormSection>
    </Form>
  );
};

export default ReviewStep;
