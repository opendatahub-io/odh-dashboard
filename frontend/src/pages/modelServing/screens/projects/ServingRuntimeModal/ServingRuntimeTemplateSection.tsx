import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  MenuItem,
  Skeleton,
  Truncate,
} from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingServingRuntimeObject } from '#~/pages/modelServing/screens/types';
import { ServingRuntimeKind, TemplateKind } from '#~/k8sTypes';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
  setServingRuntimeTemplate,
  isServingRuntimeKind,
  getServingRuntimeVersion,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import { isCompatibleWithIdentifier } from '#~/pages/projects/screens/spawner/spawnerUtils';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { CustomWatchK8sResult } from '#~/types';
import { ScopedType, SERVING_RUNTIME_SCOPE } from '#~/pages/modelServing/screens/const';
import ProjectScopedPopover from '#~/components/ProjectScopedPopover';
import ProjectScopedIcon from '#~/components/searchSelector/ProjectScopedIcon.tsx';
import {
  ProjectScopedGroupLabel,
  ProjectScopedSearchDropdown,
} from '#~/components/searchSelector/ProjectScopedSearchDropdown';
import ProjectScopedToggleContent from '#~/components/searchSelector/ProjectScopedToggleContent';
import ServingRuntimeVersionLabel from '#~/pages/modelServing/screens/ServingRuntimeVersionLabel';

type ServingRuntimeTemplateSectionProps = {
  data: CreatingServingRuntimeObject;
  onConfigureParamsClick?: () => void;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  templates: TemplateKind[];
  projectSpecificTemplates?: CustomWatchK8sResult<TemplateKind[]>;
  isEditing?: boolean;
  compatibleIdentifiers?: string[];
  servingRuntimeSelected?: ServingRuntimeKind;
  resetModelFormat?: () => void;
};

const ServingRuntimeTemplateSection: React.FC<ServingRuntimeTemplateSectionProps> = ({
  data,
  onConfigureParamsClick,
  setData,
  templates,
  projectSpecificTemplates,
  isEditing,
  compatibleIdentifiers,
  servingRuntimeSelected,
  resetModelFormat,
}) => {
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  const [searchServingRuntime, setSearchServingRuntime] = React.useState('');
  const [servingRuntimeDisplayName, setServingRuntimeDisplayName] = React.useState('');
  const filteredTemplates = React.useMemo(
    () =>
      templates.filter((template) => {
        try {
          return isServingRuntimeKind(template.objects[0]);
        } catch (e) {
          return false;
        }
      }),
    [templates],
  );

  const filterProjectScopedTemplates = React.useMemo(
    () =>
      projectSpecificTemplates &&
      projectSpecificTemplates[0].filter((template) => {
        try {
          return isServingRuntimeKind(template.objects[0]);
        } catch (e) {
          return false;
        }
      }),
    [projectSpecificTemplates],
  );

  const selectedTemplate = React.useMemo(
    () =>
      templates
        .concat(filterProjectScopedTemplates || [])
        .find(
          (template) =>
            getServingRuntimeNameFromTemplate(template) === data.servingRuntimeTemplateName,
        ),
    [templates, data.servingRuntimeTemplateName, filterProjectScopedTemplates],
  );

  const getServingRuntimeDropdownLabel = (template: TemplateKind) => (
    <>
      <FlexItem>
        <Truncate content={getServingRuntimeDisplayNameFromTemplate(template)} />
      </FlexItem>
      {getServingRuntimeVersion(template) && (
        <FlexItem>
          <ServingRuntimeVersionLabel version={getServingRuntimeVersion(template)} isCompact />
        </FlexItem>
      )}
      <FlexItem align={{ default: 'alignRight' }}>
        {compatibleIdentifiers?.some((identifier) =>
          isCompatibleWithIdentifier(identifier, template.objects[0]),
        ) && (
          <Label color="blue">
            Compatible with {isHardwareProfilesAvailable ? 'hardware profile' : 'accelerator'}
          </Label>
        )}
      </FlexItem>
    </>
  );

  const renderMenuItem = (template: TemplateKind, index: number, scope: 'project' | 'global') => (
    <MenuItem
      key={`${index}-${scope}-serving-runtime-${getServingRuntimeNameFromTemplate(template)}`}
      data-testid={`servingRuntime ${getServingRuntimeNameFromTemplate(template)}`}
      isSelected={
        data.servingRuntimeTemplateName === getServingRuntimeNameFromTemplate(template) &&
        data.scope ===
          (scope === 'project' ? SERVING_RUNTIME_SCOPE.Project : SERVING_RUNTIME_SCOPE.Global)
      }
      onClick={() =>
        setServingRuntimeTemplate({
          template,
          scope: scope === 'project' ? SERVING_RUNTIME_SCOPE.Project : SERVING_RUNTIME_SCOPE.Global,
          currentScope: data.scope ?? '',
          currentTemplateName: data.servingRuntimeTemplateName,
          setData,
          setDisplayName: setServingRuntimeDisplayName,
          resetModelFormat,
        })
      }
      icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
    >
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        {getServingRuntimeDropdownLabel(template)}
      </Flex>
    </MenuItem>
  );

  const filteredProjectScopedTemplates =
    filterProjectScopedTemplates?.filter((template) =>
      getServingRuntimeDisplayNameFromTemplate(template)
        .toLocaleLowerCase()
        .includes(searchServingRuntime.toLocaleLowerCase()),
    ) || [];
  const filteredScopedTemplates = filteredTemplates.filter((template) =>
    getServingRuntimeDisplayNameFromTemplate(template)
      .toLocaleLowerCase()
      .includes(searchServingRuntime.toLocaleLowerCase()),
  );

  if (isProjectScoped && projectSpecificTemplates && !projectSpecificTemplates[1]) {
    return (
      <FormGroup label="Serving runtime" fieldId="serving-runtime-template-selection" isRequired>
        <Skeleton />
      </FormGroup>
    );
  }

  return (
    <FormGroup
      label="Serving runtime"
      fieldId="serving-runtime-template-selection"
      isRequired
      labelHelp={
        isProjectScoped &&
        filterProjectScopedTemplates &&
        filterProjectScopedTemplates.length > 0 ? (
          <ProjectScopedPopover title="Serving runtime" item="serving runtimes" />
        ) : undefined
      }
    >
      <ProjectScopedSearchDropdown
        isDisabled={isEditing}
        projectScopedItems={filteredProjectScopedTemplates}
        globalScopedItems={filteredScopedTemplates}
        renderMenuItem={renderMenuItem}
        searchValue={searchServingRuntime}
        onSearchChange={setSearchServingRuntime}
        onSearchClear={() => setSearchServingRuntime('')}
        toggleContent={
          <ProjectScopedToggleContent
            displayName={isEditing ? data.servingRuntimeTemplateName : servingRuntimeDisplayName}
            isProject={data.scope === SERVING_RUNTIME_SCOPE.Project}
            projectLabel={ScopedType.Project}
            globalLabel={ScopedType.Global}
            isEditing={isEditing}
            style={
              isEditing
                ? { border: 'var( --pf-t--global--border--color--disabled) 1px solid' }
                : undefined
            }
            color={isEditing ? 'grey' : 'blue'}
            fallback="Select one"
            additionalContent={
              getServingRuntimeVersion(servingRuntimeSelected || selectedTemplate) && (
                <ServingRuntimeVersionLabel
                  version={getServingRuntimeVersion(servingRuntimeSelected || selectedTemplate)}
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
      {data.servingRuntimeTemplateName && onConfigureParamsClick && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem data-testid="serving-runtime-template-helptext">
              You can optimize model performance by{' '}
              <Button isInline onClick={() => onConfigureParamsClick()} variant="link">
                configuring the parameters
              </Button>{' '}
              of the selected serving runtime.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

export default ServingRuntimeTemplateSection;
