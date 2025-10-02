import * as React from 'react';
import { z } from 'zod';
import { Flex, FlexItem, FormGroup, Label, MenuItem, Truncate } from '@patternfly/react-core';
import type { SupportedModelFormats, TemplateKind } from '@odh-dashboard/internal/k8sTypes';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
import { ScopedType } from '@odh-dashboard/internal/pages/modelServing/screens/const';
import ProjectScopedPopover from '@odh-dashboard/internal/components/ProjectScopedPopover';
import ProjectScopedIcon from '@odh-dashboard/internal/components/searchSelector/ProjectScopedIcon';
import {
  ProjectScopedGroupLabel,
  ProjectScopedSearchDropdown,
} from '@odh-dashboard/internal/components/searchSelector/ProjectScopedSearchDropdown';
import ProjectScopedToggleContent from '@odh-dashboard/internal/components/searchSelector/ProjectScopedToggleContent';
import ServerVersionLabel from '@odh-dashboard/internal/pages/modelServing/screens/ServingRuntimeVersionLabel';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeFromTemplate,
  getServingRuntimeVersion,
} from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { ModelTypeFieldData } from './ModelTypeSelectField';
import type { ModelServerTemplateField } from '../types';

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

// Hooks
export type ModelServerSelectField = {
  data?: ModelServerOption | null;
  setData: (data: ModelServerOption | null) => void;
  options: ModelServerOption[];
};

export const useModelServerSelectField = (
  platformExtensionData?: ModelServerTemplateField[],
  existingData?: ModelServerOption,
  projectName?: string,
  modelServerTemplates?: TemplateKind[],
  modelFormat?: SupportedModelFormats,
  modelType?: ModelTypeFieldData,
): ModelServerSelectField => {
  const [modelServer, setModelServer] = React.useState<ModelServerOption | undefined | null>(
    existingData,
  );
  const { dashboardNamespace } = useDashboardNamespace();

  const modelServerTemplatesFiltered = React.useMemo(
    () =>
      modelServerTemplates?.filter((template) => {
        if (!modelFormat) {
          return true;
        }

        const servingRuntime = getServingRuntimeFromTemplate(template);
        if (
          servingRuntime?.spec.supportedModelFormats?.some(
            (format) => format.name === modelFormat.name && format.version === modelFormat.version,
          )
        ) {
          return true;
        }

        return false;
      }),
    [modelServerTemplates, modelFormat],
  );

  const options = React.useMemo(() => {
    const result: ModelServerOption[] = [];

    const extensionOptions =
      platformExtensionData
        ?.filter((field) => modelType && field.isActive(modelType))
        .flatMap((field) => field.modelServerTemplates) || [];
    result.push(...extensionOptions);

    const globalOptions =
      modelServerTemplatesFiltered?.filter((template) => {
        return template.metadata.namespace === dashboardNamespace;
      }) || [];
    result.push(
      ...globalOptions.map((template) => ({
        name: template.metadata.name,
        label: getServingRuntimeDisplayNameFromTemplate(template),
        scope: 'global',
        template,
      })),
    );

    const projectOptions =
      modelServerTemplatesFiltered?.filter((template) => {
        return template.metadata.namespace === projectName;
      }) || [];
    result.push(
      ...projectOptions.map((template) => ({
        name: template.metadata.name,
        label: getServingRuntimeDisplayNameFromTemplate(template),
        scope: 'project',
        template,
      })),
    );

    return result;
  }, [
    platformExtensionData,
    modelType,
    modelServerTemplatesFiltered,
    dashboardNamespace,
    projectName,
  ]);

  const updatedModelServer = React.useMemo(() => {
    // auto-select when there's only one template available
    if (options.length === 1) {
      return options[0];
    }
    return modelServer;
  }, [options, modelServer]);

  return {
    data: updatedModelServer,
    setData: setModelServer,
    options,
  };
};

// Component
type ModelServerTemplateSelectFieldProps = {
  modelServerState: ModelServerSelectField;
  profileIdentifiers: string[];
  modelFormat?: SupportedModelFormats;
  modelType?: ModelTypeFieldData;
  isEditing?: boolean;
};

const ModelServerTemplateSelectField: React.FC<ModelServerTemplateSelectFieldProps> = ({
  modelServerState,
  profileIdentifiers,
  modelFormat,
  modelType,
  isEditing,
}) => {
  const { options } = modelServerState;
  const [searchServer, setSearchServer] = React.useState('');

  const selectedTemplate = React.useMemo(() => {
    return options.find((o) => o.name === modelServerState.data?.name);
  }, [options, modelServerState.data]);

  const getServingRuntimeDropdownLabel = (option: ModelServerOption) => (
    <>
      <FlexItem>
        <Truncate content={option.label || ''} />
      </FlexItem>
      {option.template && getServingRuntimeVersion(option.template) && (
        <FlexItem>
          <ServerVersionLabel version={getServingRuntimeVersion(option.template)} isCompact />
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
  );

  const renderMenuItem = (
    option: ModelServerOption,
    index: number,
    scope: 'project' | 'global',
  ) => (
    <MenuItem
      key={`${index}-${scope}-serving-runtime-${option.name}`}
      data-testid={`servingRuntime ${option.name}`}
      isSelected={
        modelServerState.data?.name === option.name &&
        modelServerState.data.namespace === option.namespace
      }
      onClick={() =>
        modelServerState.setData({
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
  );
  const filteredProjectScopedTemplates = options.filter(
    (option) =>
      option.scope === 'project' &&
      option.label?.toLocaleLowerCase().includes(searchServer.toLocaleLowerCase()),
  );
  const filteredScopedTemplates = options.filter(
    (option) =>
      (option.scope === 'global' || option.scope === undefined) &&
      option.label?.toLocaleLowerCase().includes(searchServer.toLocaleLowerCase()),
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
    >
      <ProjectScopedSearchDropdown
        isDisabled={
          modelType === ServingRuntimeModelType.PREDICTIVE
            ? !modelFormat || options.length === 1 || isEditing
            : isEditing
        }
        projectScopedItems={filteredProjectScopedTemplates}
        globalScopedItems={filteredScopedTemplates}
        renderMenuItem={renderMenuItem}
        searchValue={searchServer}
        onSearchChange={setSearchServer}
        onSearchClear={() => setSearchServer('')}
        toggleContent={
          <ProjectScopedToggleContent
            displayName={selectedTemplate?.label}
            isProject={selectedTemplate?.scope === 'project'}
            projectLabel={ScopedType.Project}
            globalLabel={ScopedType.Global}
            fallback="Select one"
            isEditing={isEditing}
            style={
              isEditing
                ? { border: 'var(--pf-t--global--border--color--disabled) 1px solid' }
                : undefined
            }
            color={isEditing ? 'grey' : 'blue'}
            labelTestId="serving-runtime-template-label"
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
    </FormGroup>
  );
};

export default ModelServerTemplateSelectField;
