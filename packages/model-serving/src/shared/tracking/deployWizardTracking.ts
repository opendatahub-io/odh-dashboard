import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome, type FormTrackingEventProperties } from '@odh-dashboard/ui-core';
import { ModelServingTrackingEvent } from './modelServingTrackingConstants';
import type { ValidatedConfiguration, ValidatedConfigurationOption } from '../types/form-data';

export const TOOL_CALLING_CONFIGURATION_TITLE = 'Tool calling';
export const TOOL_CALLING_INJECTED_ARGS_MARKER = `# Validated arguments for ${TOOL_CALLING_CONFIGURATION_TITLE}`;

export type DeployWizardEntryPoint =
  | 'model_details'
  | 'deployments_list'
  | 'project_deployments'
  | 'navigator'
  | 'edit';

export type DeployWizardNavSource = {
  fromCatalog?: boolean;
  catalogModelId?: string;
  fromProject?: boolean;
  fromProjectNavigator?: boolean;
};

export type DeployWizardNavState = DeployWizardNavSource & {
  projectName?: string;
  editMode?: boolean;
};

export type DeployWizardStartedProperties = {
  entryPoint: DeployWizardEntryPoint;
  catalogModelId?: string;
  hasValidatedArgumentsSection: boolean;
  isEditMode: boolean;
};

export type ValidatedArgumentSelectedProperties = {
  configurationName: string;
  configurationIcon: string;
  isSelected: boolean;
  catalogModelId?: string;
  entryPoint: 'model_details';
  hasValidatedArgumentsSection: true;
};

export type ValidatedArgumentsViewedProperties = {
  configurationName: string;
  catalogModelId?: string;
  entryPoint: 'model_details';
  hasValidatedArgumentsSection: true;
};

export type ModelDeployedTrackingProperties = {
  enableToolCalling: boolean;
  validatedConfigurationCount: number;
  validatedConfigurationNames: string[];
  hasValidatedArgumentsSection: boolean;
  catalogModelId?: string;
  entryPoint: DeployWizardEntryPoint;
  outcome: 'submit' | 'cancel';
  success?: boolean;
  error?: string;
  hasInjectedValidatedArgs: boolean;
} & Record<string, string | number | boolean | string[] | undefined>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getDeployWizardNavState = (locationState: unknown): DeployWizardNavState => {
  if (!isRecord(locationState)) {
    return {};
  }
  return {
    fromCatalog: locationState.fromCatalog === true,
    catalogModelId:
      typeof locationState.catalogModelId === 'string' ? locationState.catalogModelId : undefined,
    fromProject: locationState.fromProject === true,
    projectName:
      typeof locationState.projectName === 'string' ? locationState.projectName : undefined,
    fromProjectNavigator: locationState.fromProjectNavigator === true,
    editMode: locationState.editMode === true,
  };
};

export const getDeployWizardEntryPoint = (
  navState: DeployWizardNavState,
): DeployWizardEntryPoint => {
  if (navState.editMode) {
    return 'edit';
  }
  if (navState.fromCatalog && navState.catalogModelId) {
    return 'model_details';
  }
  if (navState.fromProjectNavigator) {
    return 'navigator';
  }
  if (navState.fromProject) {
    return 'project_deployments';
  }
  return 'deployments_list';
};

/** used this for segment tracking. */
export const isShowValidatedArgumentsSection = (
  navState: DeployWizardNavState,
  validatedConfigurations?: ValidatedConfiguration[],
): boolean =>
  Boolean(navState.fromCatalog) &&
  Boolean(navState.catalogModelId) &&
  !navState.editMode &&
  Boolean(validatedConfigurations?.some((configuration) => configuration.options.length > 0));

export const getSelectedValidatedOptions = (
  configurations: ValidatedConfiguration[] | undefined,
  selected: Record<string, string[]> | undefined,
): ValidatedConfigurationOption[] => {
  if (!configurations?.length || !selected) {
    return [];
  }
  return configurations.flatMap((configuration) =>
    configuration.options.filter((option) =>
      (selected[configuration.forField] ?? []).includes(option.value),
    ),
  );
};

export const getModelDeployedTrackingProperties = ({
  navState,
  validatedConfigurations,
  selectedValidatedConfigurations,
  runtimeArgs,
  outcome,
  success,
  error,
  additionalProperties,
}: {
  navState: DeployWizardNavState;
  validatedConfigurations?: ValidatedConfiguration[];
  selectedValidatedConfigurations?: Record<string, string[]>;
  runtimeArgs?: string[];
  outcome: 'submit' | 'cancel';
  success?: boolean;
  error?: string;
  additionalProperties?: Record<string, string | number | boolean | string[] | undefined>;
}): ModelDeployedTrackingProperties => {
  const selectedOptions = getSelectedValidatedOptions(
    validatedConfigurations,
    selectedValidatedConfigurations,
  );
  const validatedConfigurationNames = selectedOptions.map((option) => option.title);
  const hasInjectedValidatedArgs = (runtimeArgs ?? []).includes(TOOL_CALLING_INJECTED_ARGS_MARKER);

  return {
    ...additionalProperties,
    enableToolCalling:
      selectedOptions.some((option) => option.title === TOOL_CALLING_CONFIGURATION_TITLE) ||
      hasInjectedValidatedArgs,
    validatedConfigurationCount: validatedConfigurationNames.length,
    validatedConfigurationNames,
    hasValidatedArgumentsSection: isShowValidatedArgumentsSection(
      navState,
      validatedConfigurations,
    ),
    catalogModelId: navState.catalogModelId,
    entryPoint: getDeployWizardEntryPoint(navState),
    outcome,
    success,
    error,
    hasInjectedValidatedArgs,
  };
};

export const getDeployWizardStartedProperties = ({
  navSource,
  projectName,
  isEditMode,
  validatedConfigurations,
}: {
  navSource?: DeployWizardNavSource;
  projectName?: string;
  isEditMode: boolean;
  validatedConfigurations?: ValidatedConfiguration[];
}): DeployWizardStartedProperties => {
  const navState: DeployWizardNavState = {
    fromCatalog: navSource?.fromCatalog,
    catalogModelId: navSource?.catalogModelId,
    fromProject: navSource?.fromProject,
    fromProjectNavigator: navSource?.fromProjectNavigator,
    projectName,
    editMode: isEditMode,
  };

  return {
    entryPoint: getDeployWizardEntryPoint(navState),
    catalogModelId: navState.catalogModelId,
    hasValidatedArgumentsSection: isShowValidatedArgumentsSection(
      navState,
      validatedConfigurations,
    ),
    isEditMode,
  };
};

export const fireDeployWizardStarted = (properties: DeployWizardStartedProperties): void => {
  fireMiscTrackingEvent(ModelServingTrackingEvent.DEPLOY_WIZARD_STARTED, properties);
};

export const fireValidatedArgumentSelected = (
  properties: ValidatedArgumentSelectedProperties,
): void => {
  fireMiscTrackingEvent(ModelServingTrackingEvent.VALIDATED_ARGUMENT_SELECTED, properties);
};

export const fireValidatedArgumentsViewed = (
  properties: ValidatedArgumentsViewedProperties,
): void => {
  fireMiscTrackingEvent(ModelServingTrackingEvent.VALIDATED_ARGUMENTS_VIEWED, properties);
};

const toFormTrackingProperties = (
  properties: ModelDeployedTrackingProperties,
): FormTrackingEventProperties => {
  const formProperties: FormTrackingEventProperties = {
    outcome: properties.outcome === 'submit' ? TrackingOutcome.submit : TrackingOutcome.cancel,
  };

  for (const [key, value] of Object.entries(properties)) {
    if (key === 'outcome' || value === undefined) {
      continue;
    }
    formProperties[key] = Array.isArray(value) ? value.join(',') : value;
  }

  return formProperties;
};

export const fireModelDeployed = (properties: ModelDeployedTrackingProperties): void => {
  fireFormTrackingEvent(
    ModelServingTrackingEvent.MODEL_DEPLOYED,
    toFormTrackingProperties(properties),
  );
};
