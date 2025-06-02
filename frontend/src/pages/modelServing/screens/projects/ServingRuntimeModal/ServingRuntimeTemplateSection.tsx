import * as React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  MenuItem,
  Skeleton,
  Split,
  SplitItem,
  Truncate,
} from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingServingRuntimeObject } from '#~/pages/modelServing/screens/types';
import { TemplateKind } from '#~/k8sTypes';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
  setServingRuntimeTemplate,
  isServingRuntimeKind,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import { isCompatibleWithIdentifier } from '#~/pages/projects/screens/spawner/spawnerUtils';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
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

type ServingRuntimeTemplateSectionProps = {
  data: CreatingServingRuntimeObject;
  onConfigureParamsClick?: () => void;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  templates: TemplateKind[];
  projectSpecificTemplates?: CustomWatchK8sResult<TemplateKind[]>;
  isEditing?: boolean;
  compatibleIdentifiers?: string[];
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

  const getServingRuntimeDropdownLabel = (template: TemplateKind) => (
    <>
      <SplitItem>
        <Truncate content={getServingRuntimeDisplayNameFromTemplate(template)} />
      </SplitItem>
      <SplitItem isFilled />
      <SplitItem>
        {compatibleIdentifiers?.some((identifier) =>
          isCompatibleWithIdentifier(identifier, template.objects[0]),
        ) && (
          <Label color="blue">
            Compatible with {isHardwareProfilesAvailable ? 'hardware profile' : 'accelerator'}
          </Label>
        )}
      </SplitItem>
    </>
  );

  const options = filteredTemplates.map(
    (template): SimpleSelectOption => ({
      key: getServingRuntimeNameFromTemplate(template),
      label: getServingRuntimeDisplayNameFromTemplate(template),
      dropdownLabel: <Split> {getServingRuntimeDropdownLabel(template)} </Split>,
    }),
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
      <Split>{getServingRuntimeDropdownLabel(template)}</Split>
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
      {isProjectScoped &&
      filterProjectScopedTemplates &&
      filterProjectScopedTemplates.length > 0 ? (
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
      ) : (
        <SimpleSelect
          isFullWidth
          isDisabled={isEditing}
          dataTestId="serving-runtime-template-selection"
          aria-label="Select a template"
          options={options}
          placeholder={
            isEditing || filteredTemplates.length === 0
              ? data.servingRuntimeTemplateName
              : 'Select one'
          }
          toggleProps={{ id: 'serving-runtime-template-selection' }}
          value={data.servingRuntimeTemplateName}
          onChange={(name) => {
            if (name !== data.servingRuntimeTemplateName) {
              setData('servingRuntimeTemplateName', name);
              if (resetModelFormat) {
                resetModelFormat();
              }
            }
          }}
          popperProps={{ appendTo: 'inline' }}
        />
      )}
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
