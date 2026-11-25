import React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import DeploymentWizardForm from './DeploymentWizardForm';
import { useRefreshWizardPage } from './useRefreshWizardPage';
import { useYamlViewSession } from './yaml/useYamlViewSession';
import { InitialWizardFormData } from '../../shared/types/form-data';
import { Deployment } from '../../../extension-points';
import type { DeploymentAssemblyResources } from '../../../extension-points/deployment-wizard';

export type ModelDeploymentWizardViewMode = 'form' | 'yaml-preview' | 'yaml-edit';

type ModelDeploymentWizardProps = {
  title: string;
  description?: string;
  primaryButtonText: string;
  initialFormDataFromNav?: InitialWizardFormData;
  project?: ProjectKind;
  existingDeployment?: Deployment;
  returnRoute?: string;
  cancelReturnRoute?: string;
};
/**
 * Core data objects are:
 * - `initialData`: Used to initialize the wizard form. Comes from navigation or from interpreting the yaml
 * - `wizardFormData`: The current state of the UI fields in the form.
 * - `...Resources` (from form or YAML): Final representation of a deployment, what is submitted to kubernetes. Used to parse between form and YAML views too.
 *
 * The form (`DeploymentWizardForm`) is keyed: switching to it after a real YAML edit remounts it,
 * so every field re-seeds from the YAML-derived `initialData`. This component keeps only what must
 * survive that remount.
 */
const ModelDeploymentWizard: React.FC<ModelDeploymentWizardProps> = ({
  initialFormDataFromNav,
  existingDeployment,
  ...pageProps
}) => {
  const onRefresh = useRefreshWizardPage(existingDeployment);
  const yamlSession = useYamlViewSession(initialFormDataFromNav?.viewMode ?? 'form');

  // Latest resources from YAML (or the existing deployment) so unmanaged properties added via YAML are merged
  const [latestResourcesFromYamlOrEdit, setLatestResourcesFromYamlOrEdit] = React.useState<
    DeploymentAssemblyResources | undefined
  >(existingDeployment);
  // Remounts the entire form with new initial values which recomputes all state
  const [formRevision, setFormRevision] = React.useState({
    revision: 0,
    initialData: initialFormDataFromNav,
  });
  // preserve the last step index when switching between yaml view
  const lastStepIndex = React.useRef<number>();

  return (
    <DeploymentWizardForm
      key={formRevision.revision}
      {...pageProps}
      existingDeployment={existingDeployment}
      initialData={formRevision.initialData}
      latestResourcesFromYamlOrEdit={latestResourcesFromYamlOrEdit}
      yamlSession={yamlSession}
      onReinitFromYaml={(formDataFromYaml, model) => {
        setLatestResourcesFromYamlOrEdit((prev) => ({ ...prev, model }));
        setFormRevision((prev) => ({
          revision: prev.revision + 1,
          // Navigation-only data (validated configurations, source metadata) isn't in the YAML
          initialData: { ...initialFormDataFromNav, ...formDataFromYaml },
        }));
      }}
      onRefresh={onRefresh}
      lastStepIndex={lastStepIndex.current}
      onStepIndexChange={(index) => {
        lastStepIndex.current = index;
      }}
    />
  );
};

export default ModelDeploymentWizard;
