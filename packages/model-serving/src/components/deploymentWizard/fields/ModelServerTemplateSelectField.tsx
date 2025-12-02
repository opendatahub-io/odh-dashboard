import * as React from 'react';
import { z } from 'zod';
import {
  Flex,
  FlexItem,
  FormGroup,
  Label,
  MenuItem,
  Radio,
  Truncate,
} from '@patternfly/react-core';
import type {
  HardwareProfileKind,
  SupportedModelFormats,
  TemplateKind,
} from '@odh-dashboard/internal/k8sTypes';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
import { ScopedType } from '@odh-dashboard/internal/pages/modelServing/screens/const';
import ProjectScopedPopover from '@odh-dashboard/internal/components/ProjectScopedPopover';
import ProjectScopedIcon from '@odh-dashboard/internal/components/searchSelector/ProjectScopedIcon';
import {
  ProjectScopedGroupLabel,
  ProjectScopedSearchDropdown,
} from '@odh-dashboard/internal/components/searchSelector/ProjectScopedSearchDropdown';
import ProjectScopedToggleContent from '@odh-dashboard/internal/components/searchSelector/ProjectScopedToggleContent';
import {
  getModelTypesFromTemplate,
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeFromTemplate,
  getServingRuntimeVersion,
} from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { IdentifierResourceType } from '@odh-dashboard/internal/types';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import ServingRuntimeVersionLabel from '@odh-dashboard/internal/pages/modelServing/screens/ServingRuntimeVersionLabel';
import { useProfileIdentifiers } from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
import { ModelTypeFieldData } from './ModelTypeSelectField';
import { useModelServingClusterSettings } from '../../../concepts/useModelServingClusterSettings';
import { useWizardFieldFromExtension } from '../dynamicFormUtils';
import { isModelServerTemplateField } from '../types';

export type ModelServerOption = {
  name: string;
  label?: string;
  namespace?: string;
  scope?: string;
  template?: TemplateKind;
};

// Schema
export const modelServerSelectFieldSchema = z.custom<ModelServerOption>((val: unknown) => {
  return !!(
    typeof val === 'object' &&
    val &&
    'name' in val &&
    typeof val.name === 'string' &&
    val.name.length > 0
  );
});

export type ModelServerSelectFieldData = ModelServerOption;

// utils

export const getAcceleratorIdentifierFromHardwareProfile = (
  hardwareProfile?: HardwareProfileKind,
): string | undefined => {
  return hardwareProfile?.spec.identifiers?.find(
    (identifier) => identifier.resourceType === IdentifierResourceType.ACCELERATOR,
  )?.identifier;
};

// Hooks
export type ModelServerSelectField = {
  data?: ModelServerOption | null;
  setData: (data: ModelServerOption | null) => void;
  isAutoSelectChecked?: boolean;
  setIsAutoSelectChecked: (isAutoSelectChecked?: boolean) => void;
  suggestion?: ModelServerOption | null; // the servingRuntime that is going to be used if the auto-select radio button is checked
  options: ModelServerOption[]; // servingRuntimes filtered on 'generative' or 'predictive' model type
};

export const useModelServerSelectField = (
  existingData?: ModelServerOption,
  modelServerTemplates?: TemplateKind[], // this is already filtered on 'generative' or 'predictive' model type
  modelFormat?: SupportedModelFormats,
  modelType?: ModelTypeFieldData,
  hardwareProfile?: HardwareProfileKind,
): ModelServerSelectField => {
  const { data: modelServingClusterSettings } = useModelServingClusterSettings();

  const modelServerSelectExtension = useWizardFieldFromExtension(isModelServerTemplateField, {
    modelType: { data: modelType },
  });
  const { dashboardNamespace } = useDashboardNamespace();

  const [modelServer, setModelServer] = React.useState<ModelServerOption | null | undefined>(
    existingData,
  );
  const [isAutoSelectChecked, setIsAutoSelectChecked] = React.useState<boolean | undefined>(
    undefined,
  );

  const previousModelType = React.useRef(modelType);
  React.useEffect(() => {
    if (previousModelType.current !== modelType) {
      setModelServer(existingData);
      setIsAutoSelectChecked(undefined);
      previousModelType.current = modelType;
    }
  }, [modelType, existingData, setModelServer, setIsAutoSelectChecked]);

  const suggestion = React.useMemo(() => {
    const extensionSuggestion = modelServerSelectExtension?.suggestion?.(
      modelServingClusterSettings,
    );
    if (extensionSuggestion) {
      return extensionSuggestion;
    }

    let filteredTemplates = modelServerTemplates;
    if (modelType) {
      filteredTemplates = filteredTemplates?.filter((template) =>
        getModelTypesFromTemplate(template).includes(modelType),
      );
    }
    if (modelFormat) {
      filteredTemplates = filteredTemplates?.filter((template) =>
        getServingRuntimeFromTemplate(template)?.spec.supportedModelFormats?.some(
          (format) => format.name === modelFormat.name && format.version === modelFormat.version,
        ),
      );
    }
    const accelerator = getAcceleratorIdentifierFromHardwareProfile(hardwareProfile);
    if (accelerator) {
      filteredTemplates = filteredTemplates?.filter((template) =>
        isCompatibleWithIdentifier(accelerator, getServingRuntimeFromTemplate(template)),
      );
    }

    if (filteredTemplates?.length === 1) {
      const suggestedTemplate = filteredTemplates[0];
      return {
        name: suggestedTemplate.metadata.name,
        namespace: suggestedTemplate.metadata.namespace,
        label: getServingRuntimeDisplayNameFromTemplate(suggestedTemplate),
        scope: suggestedTemplate.metadata.namespace === dashboardNamespace ? 'global' : 'project',
        template: suggestedTemplate,
      };
    }
    return null;
  }, [
    modelServerTemplates,
    modelFormat,
    hardwareProfile?.spec.identifiers,
    modelType,
    modelServerSelectExtension,
    modelServingClusterSettings,
    dashboardNamespace,
  ]);

  const options = React.useMemo(() => {
    const result = [];

    result.push(...(modelServerSelectExtension?.extraOptions || []));

    result.push(
      ...(modelServerTemplates?.map((template) => ({
        name: template.metadata.name,
        namespace: template.metadata.namespace,
        label: getServingRuntimeDisplayNameFromTemplate(template),
        scope: template.metadata.namespace === dashboardNamespace ? 'global' : 'project',
        template,
      })) || []),
    );

    return result;
  }, [modelServerSelectExtension?.extraOptions, modelServerTemplates, dashboardNamespace]);

  const isDirty = !!existingData || isAutoSelectChecked !== undefined;
  const autoSelect = (suggestion && !isDirty) || isAutoSelectChecked;

  return {
    data: autoSelect ? suggestion : modelServer,
    setData: setModelServer,
    isAutoSelectChecked: autoSelect,
    setIsAutoSelectChecked,
    options,
    suggestion,
  };
};

// Component
type ModelServerTemplateSelectFieldProps = {
  modelServerState: ModelServerSelectField;
  hardwareProfile?: HardwareProfileKind;
  isEditing?: boolean;
};

const ModelServerTemplateSelectField: React.FC<ModelServerTemplateSelectFieldProps> = ({
  modelServerState,
  hardwareProfile,
  isEditing,
}) => {
  const { data, setData, isAutoSelectChecked, setIsAutoSelectChecked, suggestion, options } =
    modelServerState;
  const [searchServer, setSearchServer] = React.useState('');

  const profileIdentifiers = useProfileIdentifiers(hardwareProfile);

  const selectedTemplate = React.useMemo(() => {
    return options.find((o) => o.name === data?.name && o.namespace === data.namespace) ?? data;
  }, [options, data]);

  const getServingRuntimeDropdownLabel = React.useCallback(
    (option: ModelServerOption) => (
      <>
        <FlexItem>
          <Truncate content={option.label || option.name || ''} />
        </FlexItem>
        {option.template && getServingRuntimeVersion(option.template) && (
          <FlexItem>
            <ServingRuntimeVersionLabel
              version={getServingRuntimeVersion(option.template)}
              isCompact
            />
          </FlexItem>
        )}
        {option.template && (
          <FlexItem align={{ default: 'alignRight' }}>
            {profileIdentifiers.some((identifier) =>
              isCompatibleWithIdentifier(identifier, option.template?.objects[0]),
            ) && <Label color="blue">Compatible with hardware profile</Label>}
          </FlexItem>
        )}
      </>
    ),
    [profileIdentifiers],
  );

  const renderMenuItem = React.useCallback(
    (option: ModelServerOption, index: number, scope: 'project' | 'global') => (
      <MenuItem
        key={`${index}-${scope}-serving-runtime-${option.name}`}
        data-testid={`servingRuntime ${option.name}`}
        isSelected={data?.name === option.name && data.namespace === option.namespace}
        onClick={() =>
          setData({
            name: option.name,
            label: option.label,
            namespace: option.namespace,
            scope,
            template: option.template,
          })
        }
        icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
      >
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          {getServingRuntimeDropdownLabel(option)}
        </Flex>
      </MenuItem>
    ),
    [options, data, setData, getServingRuntimeDropdownLabel],
  );

  const filteredProjectScopedTemplates = options.filter(
    (option) =>
      option.scope === 'project' &&
      option.label?.toLocaleLowerCase().includes(searchServer.toLocaleLowerCase()),
  );
  const filteredScopedTemplates = options.filter(
    (option) =>
      (option.scope === 'global' || !option.scope) &&
      option.label?.toLocaleLowerCase().includes(searchServer.toLocaleLowerCase()),
  );

  const servingRuntimeDropdown = React.useCallback(
    (isDisabled?: boolean) => {
      return (
        <ProjectScopedSearchDropdown
          isDisabled={isDisabled}
          projectScopedItems={filteredProjectScopedTemplates}
          globalScopedItems={filteredScopedTemplates}
          renderMenuItem={renderMenuItem}
          searchValue={searchServer}
          onSearchChange={setSearchServer}
          onSearchClear={() => setSearchServer('')}
          toggleContent={
            <ProjectScopedToggleContent
              displayName={selectedTemplate?.label || selectedTemplate?.name}
              isProject={selectedTemplate?.scope === 'project'}
              projectLabel={ScopedType.Project}
              globalLabel={ScopedType.Global}
              fallback="Select one"
              color={isDisabled ? 'grey' : 'blue'}
              labelTestId="serving-runtime-template-label"
              isEditing={isDisabled}
              style={
                isDisabled
                  ? { border: 'var(--pf-t--global--border--color--disabled) 1px solid' }
                  : undefined
              }
              additionalContent={
                getServingRuntimeVersion(selectedTemplate?.template) && (
                  <ServingRuntimeVersionLabel
                    version={getServingRuntimeVersion(selectedTemplate?.template)}
                    isCompact
                    isEditing={isEditing}
                  />
                )
              }
            />
          }
          projectGroupLabel={
            <ProjectScopedGroupLabel isProject>
              Project-scoped serving runtimes
            </ProjectScopedGroupLabel>
          }
          globalGroupLabel={
            <ProjectScopedGroupLabel isProject={false}>
              Global serving runtimes
            </ProjectScopedGroupLabel>
          }
          dataTestId="serving-runtime-template-selection"
          projectGroupTestId="project-scoped-serving-runtimes"
          globalGroupTestId="global-scoped-serving-runtimes"
          isFullWidth
        />
      );
    },
    [
      filteredProjectScopedTemplates,
      filteredScopedTemplates,
      renderMenuItem,
      searchServer,
      setSearchServer,
      selectedTemplate,
      isEditing,
    ],
  );

  return (
    <FormGroup
      label="Serving runtime"
      fieldId="serving-runtime-template-selection"
      isRequired
      labelHelp={
        options.filter((option) => option.scope === 'project').length > 0 ? (
          <ProjectScopedPopover title="Serving runtime" item="serving runtimes" />
        ) : undefined
      }
      role={isEditing ? 'radiogroup' : undefined}
      isStack
    >
      {isEditing ? (
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          {servingRuntimeDropdown(isEditing)}
        </Flex>
      ) : (
        <>
          <Radio
            name="horizontal-inline-radio"
            label="Auto-select the best runtime for my model based on model type, model format, and hardware profile"
            id="horizontal-inline-radio-01"
            isChecked={isAutoSelectChecked}
            isDisabled={!suggestion}
            onChange={() => setIsAutoSelectChecked(true)}
            body={
              isAutoSelectChecked && suggestion ? (
                <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                  {getServingRuntimeDropdownLabel(suggestion)}
                </Flex>
              ) : null
            }
          />
          <Radio
            name="horizontal-inline-radio"
            label="Select from a list of serving runtimes, including custom ones"
            id="horizontal-inline-radio-02"
            isChecked={!isAutoSelectChecked}
            onChange={() => setIsAutoSelectChecked(false)}
            body={isAutoSelectChecked ? null : servingRuntimeDropdown()}
          />
        </>
      )}
    </FormGroup>
  );
};

export default ModelServerTemplateSelectField;
