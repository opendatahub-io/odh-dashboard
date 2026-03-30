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
