import React from 'react';
import {
  Alert,
  ClipboardCopy,
  ClipboardCopyVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import {
  FeatureStoreFormData,
  RegistryType,
  PersistenceType,
  AuthzType,
  ScalingMode,
  ProjectDirType,
  RemoteRegistryType,
} from '../types';
import { buildFormSpec, formSpecToYaml } from '../utils';
import { StepValidation, isFormValid } from '../validationUtils';

type ReviewStepProps = {
  data: FeatureStoreFormData;
  validation: StepValidation;
  submitError?: Error;
  hasUILabeledStore: boolean;
};

type SummaryItem = {
  key: string;
  label: string;
  value: React.ReactNode;
  optional?: boolean;
};

type SummarySection = {
  title: string;
  testId: string;
  items: SummaryItem[];
};

const projectDirDescription = (data: FeatureStoreFormData): string => {
  if (data.projectDirType === ProjectDirType.INIT) {
    return `Init template: ${data.feastProjectDir?.init?.template ?? 'local'}`;
  }
  if (data.projectDirType === ProjectDirType.GIT) {
    return `Git: ${data.feastProjectDir?.git?.url || 'Not specified'}`;
  }
  return 'Default (operator managed)';
};

const registryDescription = (data: FeatureStoreFormData): string => {
  if (data.registryType === RegistryType.LOCAL) {
    return data.registryPersistenceType === PersistenceType.FILE
      ? `Local (file: ${data.services?.registry?.local?.persistence?.file?.path || 'default'})`
      : `Local (database: ${
          data.services?.registry?.local?.persistence?.store?.type || 'not set'
        })`;
  }
  if (data.remoteRegistryType === RemoteRegistryType.FEAST_REF) {
    const ref = data.services?.registry?.remote?.feastRef;
    return ref?.namespace
      ? `Feature store reference: ${ref.name} (${ref.namespace})`
      : `Feature store reference: ${ref?.name || 'not set'}`;
  }
  return `Hostname: ${data.services?.registry?.remote?.hostname || 'not set'}`;
};

const storeDescription = (
  persistenceType: PersistenceType,
  store:
    | {
        persistence?: {
          file?: { path?: string; type?: string };
          store?: { type: string };
        };
      }
    | undefined,
): string => {
  if (persistenceType === PersistenceType.DB) {
    return `Database (${store?.persistence?.store?.type ?? 'not set'})`;
  }
  const file = store?.persistence?.file;
  if (file?.path) {
    return `File (${file.path})`;
  }
  if (file?.type) {
    return `File (${file.type})`;
  }
  return 'File';
};

const getSummarySections = (data: FeatureStoreFormData): SummarySection[] => [
  {
    title: 'Details',
    testId: 'review-details',
    items: [
      { key: 'name', label: 'Feature store name', value: data.feastProject || 'Not specified' },
      { key: 'project', label: 'Project', value: data.namespace || 'Not specified' },
      { key: 'projectDir', label: 'Project directory', value: projectDirDescription(data) },
    ],
  },
  {
    title: 'Registry',
    testId: 'review-registry',
    items: [
      {
        key: 'registryType',
        label: 'Type',
        value: data.registryType === RegistryType.LOCAL ? 'Local' : 'Remote',
      },
      { key: 'registryConfig', label: 'Configuration', value: registryDescription(data) },
    ],
  },
  {
    title: 'Online & offline stores',
    testId: 'review-stores',
    items: [
      {
        key: 'onlineStore',
        label: 'Online store',
        value: storeDescription(data.onlinePersistenceType, data.services?.onlineStore),
      },
      {
        key: 'offlineStore',
        label: 'Offline store',
        value: data.offlineStoreEnabled
          ? storeDescription(data.offlinePersistenceType, data.services?.offlineStore)
          : 'Disabled',
      },
    ],
  },
  {
    title: 'Advanced options',
    testId: 'review-advanced',
    items: [
      {
        key: 'authz',
        label: 'Authorization',
        value:
          data.authzType === AuthzType.NONE
            ? 'No authorization'
            : data.authzType === AuthzType.KUBERNETES
            ? 'Kubernetes RBAC'
            : `OIDC (${data.authz?.oidc?.secretRef?.name || 'secret not selected'})`,
      },
      {
        key: 'scaling',
        label: 'Scaling',
        value: !data.scalingEnabled
          ? 'Disabled'
          : data.scalingMode === ScalingMode.STATIC
          ? `Static (${data.replicas} replica${data.replicas !== 1 ? 's' : ''})`
          : `HPA (${data.hpaMinReplicas}–${data.hpaMaxReplicas} replicas)`,
      },
      {
        key: 'cronJob',
        label: 'Cron job',
        value: data.cronJob?.schedule || 'None',
      },
      {
        key: 'batchEngine',
        label: 'Batch engine',
        value: data.batchEngineEnabled ? data.batchEngineConfigMapName || 'Enabled' : 'Disabled',
      },
    ],
  },
];

const ReviewStep: React.FC<ReviewStepProps> = ({
  data,
  validation,
  submitError,
  hasUILabeledStore,
}) => {
  const formSpec = React.useMemo(
    () => buildFormSpec(data, !hasUILabeledStore),
    [data, hasUILabeledStore],
  );
  const yamlPreview = React.useMemo(() => {
    try {
      return formSpecToYaml(formSpec);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate FeatureStore YAML preview', e);
      return '# Error generating YAML preview';
    }
  }, [formSpec]);

  const allValid = isFormValid(validation);
  const sections = getSummarySections(data);

  return (
    <Form maxWidth="750px">
      <FormSection title="Review" description="Review your feature store configuration.">
        <Stack hasGutter>
          {submitError && (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                title="Failed to create feature store"
                data-testid="review-submit-error"
              >
                {submitError.message}
              </Alert>
            </StackItem>
          )}
          {!allValid && (
            <StackItem>
              <Alert
                variant="warning"
                isInline
                title="Some steps have validation errors"
                data-testid="review-validation-warning"
              >
                Review and fix validation errors in previous steps.
              </Alert>
            </StackItem>
          )}
          {sections.map((section) => (
            <StackItem key={section.testId}>
              <FormSection title={section.title} data-testid={section.testId}>
                <DescriptionList
                  isHorizontal
                  isCompact
                  horizontalTermWidthModifier={{
                    default: '15ch',
                    lg: '18ch',
                    xl: '24ch',
                  }}
                >
                  {section.items
                    .filter((item) => !item.optional || item.value)
                    .map((item) => (
                      <DescriptionListGroup key={item.key}>
                        <DescriptionListTerm>{item.label}</DescriptionListTerm>
                        <DescriptionListDescription>{item.value}</DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                </DescriptionList>
              </FormSection>
            </StackItem>
          ))}
          <StackItem>
            <FormSection title="YAML preview" data-testid="review-yaml">
              <Title headingLevel="h4" size="md">
                FeatureStore custom resource
              </Title>
              <ClipboardCopy
                isCode
                isReadOnly
                isExpanded
                variant={ClipboardCopyVariant.expansion}
                hoverTip="Copy"
                clickTip="Copied"
                data-testid="review-yaml-content"
              >
                {yamlPreview}
              </ClipboardCopy>
            </FormSection>
          </StackItem>
        </Stack>
      </FormSection>
    </Form>
  );
};

export default ReviewStep;
