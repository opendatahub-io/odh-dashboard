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
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { ModelTypeFieldData } from './ModelTypeSelectField';
import { useModelServingClusterSettings } from '../../../concepts/useModelServingClusterSettings';
import { useWizardFieldFromExtension } from '../dynamicFormUtils';
import { isModelServerTemplateField } from '../types';

// Schema
const ModelServerOptionSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  namespace: z.string().optional(),
  scope: z.string().optional(),
  template: z.custom<TemplateKind | K8sResourceCommon>().optional(),
  version: z.string().optional(),
  compatibleWithHardwareProfile: z.boolean().optional(),
});
export type ModelServerOption = z.infer<typeof ModelServerOptionSchema>;

export const modelServerSelectFieldSchema = z.object({
  selection: ModelServerOptionSchema,
  autoSelect: z.boolean().optional(),
  suggestion: ModelServerOptionSchema.optional(),
});

// Form state allows `selection` to be undefined (nothing chosen yet)
export type ModelServerSelectFieldData = {
  selection?: ModelServerOption;
  autoSelect?: boolean;
  suggestion?: ModelServerOption;
};

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
  data?: ModelServerSelectFieldData;
  setData: (data: ModelServerSelectFieldData) => void;
  options: ModelServerOption[]; // servingRuntimes filtered on 'generative' or 'predictive' model type
};

export const useModelServerSelectField = (
  existingData?: { data: ModelServerSelectFieldData },
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

  const [modelServerState, setModelServerState] = React.useState<
    Omit<ModelServerSelectFieldData, 'suggestion'> | undefined
  >(existingData?.data);

  const profileIdentifiers = useProfileIdentifiers(hardwareProfile);

  const previousModelType = React.useRef(modelType);
  React.useEffect(() => {
    if (previousModelType.current !== modelType) {
      setModelServerState(existingData?.data);
      previousModelType.current = modelType;
    }
  }, [modelType, existingData, setModelServerState]);

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
        getModelTypesFromTemplate(template).includes(modelType.type),
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
    return undefined;
    // We want dependencies to be specific to the values being used. If something else inside hardwareProfile changes, then it will recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const result: ModelServerOption[] = [];

    result.push(...(modelServerSelectExtension?.extraOptions || []));

    result.push(
      ...(modelServerTemplates?.map(
        (template) =>
          ({
            name: template.metadata.name,
            namespace: template.metadata.namespace,
            label: getServingRuntimeDisplayNameFromTemplate(template),
            version: getServingRuntimeVersion(template),
            compatibleWithHardwareProfile: profileIdentifiers.some((identifier) =>
              isCompatibleWithIdentifier(identifier, getServingRuntimeFromTemplate(template)),
            ),
            scope: template.metadata.namespace === dashboardNamespace ? 'global' : 'project',
            template,
          } satisfies ModelServerOption),
      ) || []),
    );

    return result;
  }, [
    modelServerSelectExtension?.extraOptions,
    modelServerTemplates,
    dashboardNamespace,
    profileIdentifiers,
  ]);

  const isDirty =
    existingData || modelServerState?.selection || modelServerState?.autoSelect !== undefined;
  const autoSelect = (suggestion && !isDirty) || (modelServerState?.autoSelect && !!suggestion);
  return {
    data: {
      selection: autoSelect ? suggestion : modelServerState?.selection,
      autoSelect,
      suggestion,
    },
    setData: setModelServerState,
    options,
  };
};

// Component

const OptionDropdownLabel: React.FC<{ option: ModelServerOption }> = ({ option }) => (
  <>
    <FlexItem>
      <Truncate content={option.label || option.name || ''} />
    </FlexItem>
    {option.version && (
      <FlexItem>
        <ServingRuntimeVersionLabel version={option.version} isCompact />
      </FlexItem>
    )}
    {option.template && (
      <FlexItem align={{ default: 'alignRight' }}>
        {option.compatibleWithHardwareProfile && (
          <Label color="blue">Compatible with hardware profile</Label>
        )}
      </FlexItem>
    )}
  </>
);

type ModelServerTemplateSelectFieldProps = {
  modelServerState: ModelServerSelectField;
  isEditing?: boolean;
  label?: string;
};

const ModelServerTemplateSelectField: React.FC<ModelServerTemplateSelectFieldProps> = ({
  modelServerState,
  isEditing,
  label = 'Serving runtime',
}) => {
  const { data, setData, options } = modelServerState;
  const [searchServer, setSearchServer] = React.useState('');

  const selectedTemplate = React.useMemo(() => {
    return (
      options.find(
        (o) => o.name === data?.selection?.name && o.namespace === data.selection.namespace,
      ) ?? data?.selection
    );
  }, [options, data?.selection]);

  const renderMenuItem = React.useCallback(
    (option: ModelServerOption, index: number, scope: 'project' | 'global') => (
      <MenuItem
        key={`${index}-${scope}-serving-runtime-${option.name}`}
        data-testid={`servingRuntime ${option.name}`}
        isSelected={
          data?.selection?.name === option.name && data.selection.namespace === option.namespace
        }
        onClick={() =>
          setData({
            ...data,
            selection: {
              name: option.name,
              namespace: option.namespace,
              label: option.label,
              version: option.version,
              compatibleWithHardwareProfile: option.compatibleWithHardwareProfile,
              scope,
              template: option.template,
            },
          })
        }
        icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
      >
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <OptionDropdownLabel option={option} />
        </Flex>
      </MenuItem>
    ),
    [data, setData],
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

  const templateDropdown = React.useCallback(
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
                selectedTemplate?.version && (
                  <ServingRuntimeVersionLabel
                    version={selectedTemplate.version}
                    isCompact
                    isEditing={isEditing}
                  />
                )
              }
            />
          }
          projectGroupLabel={
            <ProjectScopedGroupLabel isProject>
              Project-scoped {label.toLocaleLowerCase()}s
            </ProjectScopedGroupLabel>
          }
          globalGroupLabel={
            <ProjectScopedGroupLabel isProject={false}>
              Global {label.toLocaleLowerCase()}s
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
      label,
    ],
  );

  return (
    <FormGroup
      label={label}
      fieldId="serving-runtime-template-selection"
      isRequired
      labelHelp={
        options.filter((option) => option.scope === 'project').length > 0 ? (
          <ProjectScopedPopover title={label} item={`${label.toLocaleLowerCase()}s`} />
        ) : undefined
      }
      role={isEditing ? 'radiogroup' : undefined}
      isStack
    >
      {isEditing ? (
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          {templateDropdown(isEditing)}
        </Flex>
      ) : (
        <>
          <Radio
            data-testid="model-server-auto-select-radio"
            name="horizontal-inline-radio"
            label={`Auto-select the best ${label.toLocaleLowerCase()} for my model based on model type, model format, and hardware profile`}
            id="horizontal-inline-radio-01"
            isChecked={data?.autoSelect}
            isDisabled={!data?.suggestion}
            onChange={() => setData({ ...data, autoSelect: true, selection: data?.suggestion })}
            body={
              data?.autoSelect && data.suggestion ? (
                <Flex
                  gap={{ default: 'gapSm' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                  data-testid="model-server-auto-select-suggestion"
                >
                  <OptionDropdownLabel option={data.suggestion} />
                </Flex>
              ) : null
            }
          />
          <Radio
            data-testid="model-server-manual-select-radio"
            name="horizontal-inline-radio"
            label={`Select from a list of ${label.toLocaleLowerCase()}s, including custom ones`}
            id="horizontal-inline-radio-02"
            isChecked={!data?.autoSelect}
            onChange={() => setData({ ...data, autoSelect: false, selection: undefined })}
            body={data?.autoSelect ? null : templateDropdown()}
          />
        </>
      )}
    </FormGroup>
  );
};

export default ModelServerTemplateSelectField;
