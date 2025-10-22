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

type ReviewStepContentProps = {
  wizardState: UseModelDeploymentWizardState;
};

type WizardState = UseModelDeploymentWizardState['state'];

type StatusItem = {
  key: string;
  label: string;
  comp: (state: WizardState) => React.ReactNode;
  optional?: boolean;
  isVisible?: (wizardState: UseModelDeploymentWizardState) => boolean;
};

type StatusSection = {
  title: string;
  items: StatusItem[];
};

const statusSections: StatusSection[] = [
  {
    title: 'Model details',
    items: [
      {
        key: 'modelType',
        label: 'Model type',
        comp: (state) => state.modelType.data || '--',
      },
      {
        key: 'modelLocation',
        label: 'Model location',
        comp: (state) => {
          const connection = state.modelLocationData.data?.connection;
          return connection ? 'Existing connection' : 'New connection';
        },
      },
      {
        key: 'connectionName',
        label: 'Connection name',
        comp: (state) => state.modelLocationData.data?.connection || undefined,
        optional: true,
      },
    ],
  },
  {
    title: 'Model deployment',
    items: [
      {
        key: 'modelName',
        label: 'Model deployment name',
        comp: (state) => state.k8sNameDesc.data.name || '--',
      },
      {
        key: 'modelDescription',
        label: 'Description',
        comp: (state) => state.k8sNameDesc.data.description || undefined,
        optional: true,
      },
      {
        key: 'hardwareProfile',
        label: 'Hardware profile',
        comp: (state) =>
          state.hardwareProfileConfig.formData.selectedProfile?.metadata.name || 'default',
      },
      {
        key: 'modelFormat',
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
        key: 'servingRuntime',
        label: 'Serving runtime',
        comp: (state) => state.modelServer.data?.name || 'Auto-selected',
      },
      {
        key: 'replicas',
        label: 'Replicas',
        comp: (state) => state.numReplicas.data || 1,
      },
    ],
  },
  {
    title: 'Advanced settings',
    items: [
      {
        key: 'aiAssetEndpoint',
        label: 'AI asset endpoint',
        comp: (state) => (state.modelAvailability.data.saveAsAiAsset ? 'Yes' : 'No'),
        isVisible: (wizardState) => !!wizardState.state.modelAvailability.showField,
      },
      {
        key: 'useCase',
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
        key: 'tokenAuth',
        label: 'Token authentication',
        comp: (state) =>
          state.tokenAuthentication.data && state.tokenAuthentication.data.length > 0
            ? 'Yes'
            : 'No',
      },
      {
        key: 'serviceAccounts',
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
              <div>{allArgs.join(', ')}</div>
            </>
          );
        },
        optional: true,
      },
      {
        key: 'envVars',
        label: 'Additional environment variables',
        comp: (state) => {
          const envVars = state.environmentVariables.data;
          if (!envVars || !envVars.enabled || envVars.variables.length === 0) {
            return undefined;
          }
          return (
            <>
              <div>{envVars.variables.length}</div>
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

export const ReviewStepContent: React.FC<ReviewStepContentProps> = ({ wizardState }) => {
  return (
    <Form>
      <FormSection title="Summary">
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
                    horizontalTermWidthModifier={{
                      default: '15ch',
                      lg: '18ch',
                      xl: '24ch',
                    }}
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
