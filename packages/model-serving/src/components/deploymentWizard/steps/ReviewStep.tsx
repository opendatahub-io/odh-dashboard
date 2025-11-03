import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import { ModelLocationType } from '../types';

type ReviewStepContentProps = {
  wizardState: UseModelDeploymentWizardState;
  projectName?: string;
};

type WizardState = UseModelDeploymentWizardState['state'];
type WizardStateKey = keyof WizardState;
type StatusItemKey = WizardStateKey | `${WizardStateKey}-${string}` | 'projectName';

type StatusItem<K extends StatusItemKey = StatusItemKey> = {
  key: K;
  label: string;
  comp: (state: WizardState) => React.ReactNode;
  optional?: boolean;
  isVisible?: (wizardState: UseModelDeploymentWizardState) => boolean;
};

type StatusSection = {
  title: string;
  items: StatusItem[];
};

const getStatusSections = (projectName?: string): StatusSection[] => [
  {
    title: 'Model details',
    items: [
      {
        key: 'modelType',
        label: 'Model type',
        comp: (state) => state.modelType.data || '--',
      },
      {
        key: 'modelLocationData-locationType',
        label: 'Model location',
        comp: (state) => {
          const locationData = state.modelLocationData.data;
          if (!locationData) {
            return '--';
          }
          if (locationData.type === ModelLocationType.EXISTING) {
            return 'Existing connection';
          }
          if (locationData.type === ModelLocationType.PVC) {
            return 'Cluster storage';
          }
          const connectionTypeName = locationData.connectionTypeObject?.metadata.name;
          if (connectionTypeName === 's3') {
            return 'S3 object storage';
          }
          if (connectionTypeName === 'oci-v1') {
            return 'OCI compliant registry';
          }
          if (connectionTypeName === 'uri-v1') {
            return 'URI';
          }

          return 'New connection';
        },
      },
      {
        key: 'modelLocationData-existingConnectionName',
        label: 'Connection name',
        comp: (state) => state.modelLocationData.data?.connection || undefined,
        optional: true,
        isVisible: (wizardState) =>
          wizardState.state.modelLocationData.data?.type === ModelLocationType.EXISTING,
      },
      {
        key: 'modelLocationData-newConnection',
        label: 'New connection',
        comp: () => 'Yes',
        isVisible: (wizardState) =>
          wizardState.state.modelLocationData.data?.type === ModelLocationType.NEW,
      },
      {
        key: 'createConnectionData-name',
        label: 'Connection name',
        comp: (state) => state.createConnectionData.data.nameDesc?.name || undefined,
        optional: true,
        isVisible: (wizardState) =>
          wizardState.state.modelLocationData.data?.type === ModelLocationType.NEW &&
          wizardState.state.createConnectionData.data.saveConnection === true,
      },
      {
        key: 'createConnectionData-description',
        label: 'Connection description',
        comp: (state) => state.createConnectionData.data.nameDesc?.description || undefined,
        optional: true,
        isVisible: (wizardState) =>
          wizardState.state.modelLocationData.data?.type === ModelLocationType.NEW &&
          wizardState.state.createConnectionData.data.saveConnection === true,
      },
      {
        key: 'modelLocationData-connectionFields',
        label: 'Connection details',
        comp: (state) => {
          const locationData = state.modelLocationData.data;
          if (!locationData || locationData.type !== ModelLocationType.NEW) {
            return undefined;
          }

          const { fieldValues: fields, additionalFields } = locationData;

          return (
            <>
              {Object.entries(fields).map(([key, value]) => {
                if (!value) {
                  return null;
                }
                const label = key
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');

                const isSensitive = key.toLowerCase().includes('secret');
                const displayValue = isSensitive ? '•'.repeat(String(value).length) : String(value);

                return (
                  <div key={key}>
                    {label}: {displayValue}
                  </div>
                );
              })}
              {additionalFields.modelPath && <>Model path: {additionalFields.modelPath}</>}
              {additionalFields.modelUri && <>Model URI: {additionalFields.modelUri}</>}
            </>
          );
        },
        optional: true,
        isVisible: (wizardState) =>
          wizardState.state.modelLocationData.data?.type === ModelLocationType.NEW,
      },
      {
        key: 'modelLocationData-pvcFields',
        label: 'Storage details',
        comp: (state) => {
          const locationData = state.modelLocationData.data;
          if (!locationData || locationData.type !== ModelLocationType.PVC) {
            return undefined;
          }

          const { additionalFields } = locationData;

          return (
            <>
              {additionalFields.pvcConnection && <>PVC: {additionalFields.pvcConnection}</>}
              {additionalFields.modelPath && <>Path: {additionalFields.modelPath}</>}
            </>
          );
        },
        optional: true,
        isVisible: (wizardState) =>
          wizardState.state.modelLocationData.data?.type === ModelLocationType.PVC,
      },
    ],
  },
  {
    title: 'Model deployment',
    items: [
      {
        key: 'projectName',
        label: 'Project',
        comp: () => projectName,
      },
      {
        key: 'k8sNameDesc-name',
        label: 'Model deployment name',
        comp: (state) => state.k8sNameDesc.data.name || '--',
      },
      {
        key: 'k8sNameDesc-description',
        label: 'Description',
        comp: (state) => state.k8sNameDesc.data.description || undefined,
        optional: true,
      },
      {
        key: 'hardwareProfileConfig',
        label: 'Hardware profile',
        comp: (state) =>
          state.hardwareProfileConfig.formData.selectedProfile?.metadata.name || 'default',
      },
      {
        key: 'modelFormatState',
        label: 'Model format',
        comp: (state) => {
          const format = state.modelFormatState.modelFormat;
          if (!format) {
            return undefined;
          }
          return format.version ? `${format.name} - ${format.version}` : format.name;
        },
        optional: true,
      },
      {
        key: 'modelServer',
        label: 'Serving runtime',
        comp: (state) => state.modelServer.data?.name || 'Auto-selected',
      },
      {
        key: 'numReplicas',
        label: 'Replicas',
        comp: (state) => state.numReplicas.data ?? 1,
      },
    ],
  },
  {
    title: 'Advanced settings',
    items: [
      {
        key: 'modelAvailability-aiAssetEndpoint',
        label: 'AI asset endpoint',
        comp: (state) => (state.modelAvailability.data.saveAsAiAsset ? 'Yes' : 'No'),
        isVisible: (wizardState) => !!wizardState.state.modelAvailability.showField,
      },
      {
        key: 'modelAvailability-maasEndpoint',
        label: 'Add as MaaS endpoint',
        comp: (state) => (state.modelAvailability.data.saveAsMaaS ? 'Yes' : 'No'),
        isVisible: (wizardState) => !!wizardState.state.modelAvailability.showSaveAsMaaS,
      },
      {
        key: 'modelAvailability-useCase',
        label: 'Use case',
        comp: (state) => state.modelAvailability.data.useCase || undefined,
        optional: true,
        isVisible: (wizardState) => !!wizardState.state.modelAvailability.showField,
      },
      {
        key: 'externalRoute',
        label: 'External route',
        comp: (state) => (state.externalRoute.data ? 'Yes' : 'No'),
        isVisible: (wizardState) => !!wizardState.advancedOptions.isExternalRouteVisible,
      },
      {
        key: 'tokenAuthentication',
        label: 'Token authentication',
        comp: (state) =>
          state.tokenAuthentication.data && state.tokenAuthentication.data.length > 0
            ? 'Yes'
            : 'No',
      },
      {
        key: 'tokenAuthentication-serviceAccounts',
        label: 'Service accounts',
        comp: (state) => {
          const tokens = state.tokenAuthentication.data;
          if (!tokens || tokens.length === 0) {
            return undefined;
          }
          return tokens.map((token) => token.displayName).join(', ');
        },
        optional: true,
      },
      {
        key: 'runtimeArgs',
        label: 'Additional runtime arguments',
        comp: (state) => {
          const runtimeArgs = state.runtimeArgs.data;
          if (!runtimeArgs || !runtimeArgs.enabled || runtimeArgs.args.length === 0) {
            return undefined;
          }
          const allArgs = runtimeArgs.args.flatMap((arg) =>
            arg.trim().split(/\s+/).filter(Boolean),
          );
          return (
            <>
              <div>{allArgs.length}</div>
              <>{allArgs.join(', ')}</>
            </>
          );
        },
        optional: true,
      },
      {
        key: 'environmentVariables',
        label: 'Additional environment variables',
        comp: (state) => {
          const envVars = state.environmentVariables.data;
          if (!envVars || !envVars.enabled || envVars.variables.length === 0) {
            return undefined;
          }
          return (
            <>
              <>{envVars.variables.length}</>
              {envVars.variables.map((envVar, index: number) => (
                <div key={index}>
                  {envVar.name}, {envVar.value}
                </div>
              ))}
            </>
          );
        },
        optional: true,
      },
    ],
  },
];

export const ReviewStepContent: React.FC<ReviewStepContentProps> = ({
  wizardState,
  projectName,
}) => {
  const statusSections = React.useMemo(() => getStatusSections(projectName), [projectName]);

  return (
    <Form>
      <FormSection title="Review">
        <Stack hasGutter style={{ marginTop: '14px' }}>
          {statusSections.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (item.isVisible && !item.isVisible(wizardState)) {
                return false;
              }
              if (!item.optional) {
                return true;
              }
              const value = item.comp(wizardState.state);
              return value !== undefined && value !== null && value !== '';
            });

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <StackItem key={section.title}>
                <FormSection title={section.title}>
                  <DescriptionList
                    isHorizontal
                    isCompact
                    horizontalTermWidthModifier={{
                      default: '15ch',
                      lg: '18ch',
                      xl: '24ch',
                    }}
                    style={{ rowGap: '0.35rem' }}
                  >
                    {visibleItems.map((item) => (
                      <DescriptionListGroup key={item.key}>
                        <DescriptionListTerm style={{ fontWeight: 'normal' }}>
                          {item.label}
                          {': '}
                        </DescriptionListTerm>
                        <DescriptionListDescription>
                          {item.comp(wizardState.state)}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                </FormSection>
              </StackItem>
            );
          })}
        </Stack>
      </FormSection>
    </Form>
  );
};
