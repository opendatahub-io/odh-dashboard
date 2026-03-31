import * as React from 'react';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  Popover,
  Stack,
  StackItem,
  Timestamp,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ActionsColumn, ExpandableRowContent, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import {
  FeatureStoreKind,
  FeastOnlineStore,
  FeastOfflineStore,
} from '@odh-dashboard/internal/k8sTypes';

type FeatureStoreTableRowProps = {
  featureStore: FeatureStoreKind;
  rowIndex: number;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  isUILabeled: boolean;
  canDelete: boolean;
  onDelete: (fs: FeatureStoreKind) => void;
};

const phaseLabel = (phase?: string): React.ReactNode => {
  switch (phase) {
    case 'Ready':
      return <Label color="green">Ready</Label>;
    case 'Failed':
      return <Label color="red">Failed</Label>;
    case 'Installing':
      return <Label color="blue">Installing</Label>;
    default:
      return <Label color="grey">{phase ?? 'Pending'}</Label>;
  }
};

const getRegistrySummary = (fs: FeatureStoreKind): string => {
  const registry = fs.spec.services?.registry;
  if (!registry) {
    return 'Default';
  }
  if (registry.remote) {
    if (registry.remote.hostname) {
      return `Remote (hostname: ${registry.remote.hostname})`;
    }
    if (registry.remote.feastRef) {
      const { feastRef } = registry.remote;
      return `Remote (ref: ${feastRef.namespace ? `${feastRef.namespace}/` : ''}${feastRef.name})`;
    }
    return 'Remote';
  }
  if (registry.local) {
    const { persistence } = registry.local;
    if (persistence?.store) {
      return `Local (DB: ${persistence.store.type})`;
    }
    if (persistence?.file?.path) {
      return `Local (file: ${persistence.file.path})`;
    }
    return 'Local (file)';
  }
  return 'Default';
};

const getOnlineStoreSummary = (store: FeastOnlineStore | undefined): string => {
  if (!store) {
    return 'Disabled';
  }
  if (store.persistence?.store) {
    return `DB (${store.persistence.store.type})`;
  }
  if (store.persistence?.file) {
    return `File${store.persistence.file.path ? ` (${store.persistence.file.path})` : ''}`;
  }
  return 'Default';
};

const getOfflineStoreSummary = (store: FeastOfflineStore | undefined): string => {
  if (!store) {
    return 'Disabled';
  }
  if (store.persistence?.store) {
    return `DB (${store.persistence.store.type})`;
  }
  if (store.persistence?.file) {
    return `File${store.persistence.file.type ? ` (${store.persistence.file.type})` : ''}`;
  }
  return 'Default';
};

const getAuthzSummary = (fs: FeatureStoreKind): string => {
  const { authz } = fs.spec;
  if (!authz) {
    return 'None';
  }
  if (authz.oidc) {
    return 'OIDC';
  }
  if (authz.kubernetes) {
    return 'Kubernetes RBAC';
  }
  return 'None';
};

const getScalingSummary = (fs: FeatureStoreKind): string => {
  const scaling = fs.spec.services?.scaling;
  if (scaling?.autoscaling) {
    const { minReplicas, maxReplicas } = scaling.autoscaling;
    return `HPA (${minReplicas ?? 1}–${maxReplicas} replicas)`;
  }
  if (fs.spec.replicas && fs.spec.replicas > 1) {
    return `Static (${fs.spec.replicas} replicas)`;
  }
  return 'Single replica';
};

const FeatureStoreTableRow: React.FC<FeatureStoreTableRowProps> = ({
  featureStore: fs,
  rowIndex,
  isExpanded,
  onToggleExpansion,
  isUILabeled,
  canDelete,
  onDelete,
}) => {
  const { services } = fs.spec;
  const hostnames = fs.status?.serviceHostnames;
  const conditions = fs.status?.conditions;

  return (
    <>
      <Tr>
        <Td
          expand={{
            rowIndex,
            expandId: `feature-store-${fs.metadata.name}`,
            isExpanded,
            onToggle: onToggleExpansion,
          }}
        />
        <Td dataLabel="Name">
          {fs.status?.phase === 'Ready' ? (
            <Link to={`/develop-train/feature-store/overview/${fs.spec.feastProject}`}>
              {fs.metadata.name}
            </Link>
          ) : (
            fs.metadata.name
          )}
          {isUILabeled && (
            <>
              {' '}
              <Popover bodyContent="This is the primary feature store whose registry is shared with other feature stores. Additional feature stores should use a remote registry pointing to this store.">
                <Label
                  color="blue"
                  isCompact
                  icon={<OutlinedQuestionCircleIcon />}
                  style={{ cursor: 'pointer' }}
                >
                  Primary
                </Label>
              </Popover>
            </>
          )}
        </Td>
        <Td dataLabel="Namespace">{fs.metadata.namespace}</Td>
        <Td dataLabel="Status">{phaseLabel(fs.status?.phase)}</Td>
        <Td dataLabel="Version">{fs.status?.feastVersion ?? '-'}</Td>
        <Td dataLabel="Created">
          {fs.metadata.creationTimestamp ? (
            <Timestamp date={new Date(fs.metadata.creationTimestamp)} />
          ) : (
            '-'
          )}
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Delete',
                isDisabled: !canDelete,
                onClick: () => onDelete(fs),
              },
            ]}
          />
        </Td>
      </Tr>
      {isExpanded && (
        <Tr isExpanded={isExpanded}>
          <Td />
          <Td dataLabel="Details" colSpan={6}>
            <ExpandableRowContent>
              <Stack hasGutter>
                <StackItem>
                  <DescriptionList columnModifier={{ default: '2Col' }} isCompact>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Feast project</DescriptionListTerm>
                      <DescriptionListDescription>
                        {fs.spec.feastProject}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Registry</DescriptionListTerm>
                      <DescriptionListDescription>
                        {getRegistrySummary(fs)}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Online store</DescriptionListTerm>
                      <DescriptionListDescription>
                        {getOnlineStoreSummary(services?.onlineStore)}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Offline store</DescriptionListTerm>
                      <DescriptionListDescription>
                        {getOfflineStoreSummary(services?.offlineStore)}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Authorization</DescriptionListTerm>
                      <DescriptionListDescription>{getAuthzSummary(fs)}</DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Scaling</DescriptionListTerm>
                      <DescriptionListDescription>
                        {getScalingSummary(fs)}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    {fs.spec.cronJob?.schedule && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>CronJob schedule</DescriptionListTerm>
                        <DescriptionListDescription>
                          {fs.spec.cronJob.schedule}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {fs.spec.batchEngine?.configMapRef && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Batch engine</DescriptionListTerm>
                        <DescriptionListDescription>
                          {fs.spec.batchEngine.configMapRef.name}
                          {fs.spec.batchEngine.configMapKey
                            ? ` (key: ${fs.spec.batchEngine.configMapKey})`
                            : ''}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {fs.status?.clientConfigMap && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Client ConfigMap</DescriptionListTerm>
                        <DescriptionListDescription>
                          {fs.status.clientConfigMap}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                  </DescriptionList>
                </StackItem>
                {hostnames &&
                  (hostnames.registry ||
                    hostnames.onlineStore ||
                    hostnames.offlineStore ||
                    hostnames.registryRest) && (
                    <StackItem>
                      <p className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm">Service hostnames</p>
                      <DescriptionList columnModifier={{ default: '2Col' }} isCompact>
                        {hostnames.registry && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Registry (gRPC)</DescriptionListTerm>
                            <DescriptionListDescription>
                              {hostnames.registry}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                        {hostnames.registryRest && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Registry (REST)</DescriptionListTerm>
                            <DescriptionListDescription>
                              {hostnames.registryRest}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                        {hostnames.onlineStore && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Online store</DescriptionListTerm>
                            <DescriptionListDescription>
                              {hostnames.onlineStore}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                        {hostnames.offlineStore && (
                          <DescriptionListGroup>
                            <DescriptionListTerm>Offline store</DescriptionListTerm>
                            <DescriptionListDescription>
                              {hostnames.offlineStore}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        )}
                      </DescriptionList>
                    </StackItem>
                  )}
                {conditions && conditions.length > 0 && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm">Conditions</p>
                    <DescriptionList isCompact>
                      {conditions.map((c) => (
                        <DescriptionListGroup key={c.type}>
                          <DescriptionListTerm>
                            {c.type}{' '}
                            <Label isCompact color={c.status === 'True' ? 'green' : 'grey'}>
                              {c.status}
                            </Label>
                          </DescriptionListTerm>
                          <DescriptionListDescription>
                            {c.message || c.reason || '—'}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      ))}
                    </DescriptionList>
                  </StackItem>
                )}
              </Stack>
            </ExpandableRowContent>
          </Td>
        </Tr>
      )}
    </>
  );
};

export default FeatureStoreTableRow;
