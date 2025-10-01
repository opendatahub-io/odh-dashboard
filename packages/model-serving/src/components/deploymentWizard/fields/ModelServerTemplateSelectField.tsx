import * as React from 'react';
import { z } from 'zod';
import { Flex, FlexItem, FormGroup, Label, MenuItem, Truncate } from '@patternfly/react-core';
import type { SupportedModelFormats, TemplateKind } from '@odh-dashboard/internal/k8sTypes';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
import {
  ScopedType,
  SERVING_RUNTIME_SCOPE,
} from '@odh-dashboard/internal/pages/modelServing/screens/const';
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

// Schema
export const modelServerSelectFieldSchema = z.object({
  name: z.string().min(1),
  namespace: z.string().min(1),
  scope: z.string().min(1),
});

export type ModelServerSelectFieldData = z.infer<typeof modelServerSelectFieldSchema>;
export const isValidModelServer = (
  value: ModelServerSelectFieldData,
): value is ModelServerSelectFieldData => value.name.length > 0;

// Hooks
export type ModelServerSelectField = {
  data: ModelServerSelectFieldData | undefined;
  setData: (data: ModelServerSelectFieldData) => void;
  projectTemplates: TemplateKind[];
  modelServerTemplates: TemplateKind[];
};

export const useModelServerSelectField = (
  existingData?: ModelServerSelectFieldData,
  projectName?: string,
  modelServerTemplates?: TemplateKind[],
  modelFormat?: SupportedModelFormats,
): ModelServerSelectField => {
  const [modelServer, setModelServer] = React.useState<ModelServerSelectFieldData | undefined>(
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

  // Auto-select when there's only one template available
  React.useEffect(() => {
    if (modelServerTemplatesFiltered?.length === 1) {
      setModelServer({
        name: modelServerTemplatesFiltered[0].metadata.name,
        namespace: modelServerTemplatesFiltered[0].metadata.namespace,
        scope:
          modelServerTemplatesFiltered[0].metadata.namespace === dashboardNamespace
            ? SERVING_RUNTIME_SCOPE.Global
            : SERVING_RUNTIME_SCOPE.Project,
      });
    }
  }, [modelServerTemplatesFiltered, dashboardNamespace]);

  const globalModelServerTemplates = modelServerTemplatesFiltered?.filter((template) => {
    return template.metadata.namespace === dashboardNamespace;
  });

  const projectTemplatesFiltered = modelServerTemplatesFiltered?.filter((template) => {
    return template.metadata.namespace === projectName;
  });

  return {
    data: modelServer,
    setData: setModelServer,
    projectTemplates: projectTemplatesFiltered || [],
    modelServerTemplates: globalModelServerTemplates || [],
  };
};

// Component
type ModelServerTemplateSelectFieldProps = {
  modelServerState: ModelServerSelectField;
  profileIdentifiers: string[];
  modelServerTemplates: TemplateKind[];
  projectTemplates: TemplateKind[];
  modelFormat?: SupportedModelFormats;
  modelType?: ModelTypeFieldData;
  projectName?: string;
  isEditing?: boolean;
};

const ModelServerTemplateSelectField: React.FC<ModelServerTemplateSelectFieldProps> = ({
  modelServerState,
  profileIdentifiers,
  modelServerTemplates,
  projectTemplates,
  modelFormat,
  modelType,
  projectName,
  isEditing,
}) => {
  const [searchServer, setSearchServer] = React.useState('');

  const selectedTemplate = React.useMemo(() => {
    const allModelServerTemplates = modelServerTemplates.concat(projectTemplates);

    return allModelServerTemplates.find(
      (template) =>
        template.metadata.name === modelServerState.data?.name &&
        template.metadata.namespace === modelServerState.data.namespace,
    );
  }, [modelServerTemplates, projectTemplates, modelServerState.data]);

  const getServingRuntimeDropdownLabel = (template: TemplateKind) => (
    <>
      <FlexItem>
        <Truncate content={getServingRuntimeDisplayNameFromTemplate(template) || ''} />
      </FlexItem>
      {getServingRuntimeVersion(template) && (
        <FlexItem>
          <ServerVersionLabel version={getServingRuntimeVersion(template)} isCompact />
        </FlexItem>
      )}
      <FlexItem align={{ default: 'alignRight' }}>
        {profileIdentifiers.some((identifier) =>
          isCompatibleWithIdentifier(identifier, template.objects[0]),
        ) && <Label color="blue">Compatible with hardware profile</Label>}
      </FlexItem>
    </>
  );

  const renderMenuItem = (template: TemplateKind, index: number, scope: 'project' | 'global') => (
    <MenuItem
      key={`${index}-${scope}-serving-runtime-${template.metadata.name}`}
      data-testid={`servingRuntime ${template.metadata.name}`}
      isSelected={
        modelServerState.data?.name === template.metadata.name &&
        modelServerState.data.namespace === template.metadata.namespace
      }
      onClick={() =>
        modelServerState.setData({
          name: template.metadata.name,
          namespace: template.metadata.namespace,
          scope,
        })
      }
      icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
    >
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        {getServingRuntimeDropdownLabel(template)}
      </Flex>
    </MenuItem>
  );

  const filteredProjectScopedTemplates = projectTemplates.filter((template: TemplateKind) =>
    getServingRuntimeDisplayNameFromTemplate(template)
      .toLocaleLowerCase()
      .includes(searchServer.toLocaleLowerCase()),
  );
  const filteredScopedTemplates = modelServerTemplates.filter((template) =>
    getServingRuntimeDisplayNameFromTemplate(template)
      .toLocaleLowerCase()
      .includes(searchServer.toLocaleLowerCase()),
  );

  return (
    <FormGroup
      label="Serving runtime"
      fieldId="serving-runtime-template-selection"
      isRequired
      labelHelp={
        projectTemplates.length > 0 ? (
          <ProjectScopedPopover title="Serving runtime" item="serving runtimes" />
        ) : undefined
      }
    >
      <ProjectScopedSearchDropdown
        isDisabled={
          modelType === ServingRuntimeModelType.PREDICTIVE
            ? !modelFormat ||
              modelServerTemplates.concat(projectTemplates).length === 1 ||
              isEditing
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
            displayName={
              selectedTemplate?.objects[0].metadata.annotations?.['openshift.io/display-name']
            }
            isProject={selectedTemplate?.metadata.namespace === projectName}
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
            additionalContent={
              getServingRuntimeVersion(selectedTemplate) && (
                <ServerVersionLabel
                  version={getServingRuntimeVersion(selectedTemplate)}
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
    </FormGroup>
  );
};

export default ModelServerTemplateSelectField;
