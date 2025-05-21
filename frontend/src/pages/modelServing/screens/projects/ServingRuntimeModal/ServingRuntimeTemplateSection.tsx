import * as React from 'react';
import {
  Button,
  Divider,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  MenuGroup,
  MenuItem,
  Skeleton,
  Split,
  SplitItem,
  Truncate,
} from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { TemplateKind } from '~/k8sTypes';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
  setServingRuntimeTemplate,
  isServingRuntimeKind,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { isCompatibleWithIdentifier } from '~/pages/projects/screens/spawner/spawnerUtils';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import { ProjectObjectType } from '~/concepts/design/utils';
import GlobalIcon from '~/images/icons/GlobalIcon';
import { CustomWatchK8sResult } from '~/types';
import { SERVING_RUNTIME_SCOPE } from '~/pages/modelServing/screens/const';
import ProjectScopedPopover from '~/components/ProjectScopedPopover';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';

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

  const options = filteredTemplates.map(
    (template): SimpleSelectOption => ({
      key: getServingRuntimeNameFromTemplate(template),
      label: getServingRuntimeDisplayNameFromTemplate(template),
      dropdownLabel: (
        <Split>
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
        </Split>
      ),
    }),
  );

  const getServingRuntime = () => {
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

    return (
      <>
        {filteredProjectScopedTemplates.length > 0 && (
          <MenuGroup
            data-testid="project-scoped-serving-runtimes"
            label={
              <Flex
                spaceItems={{ default: 'spaceItemsXs' }}
                alignItems={{ default: 'alignItemsCenter' }}
                style={{ paddingBottom: '5px' }}
              >
                <FlexItem style={{ display: 'flex', paddingLeft: '12px' }}>
                  <TypedObjectIcon
                    style={{ height: '12px', width: '12px' }}
                    alt=""
                    resourceType={ProjectObjectType.project}
                  />
                </FlexItem>
                <FlexItem>Project-scoped serving runtimes</FlexItem>
              </Flex>
            }
          >
            {filteredProjectScopedTemplates.map((template, index) => (
              <MenuItem
                key={`servingRuntime-${index}`}
                data-testid={`servingRuntime ${getServingRuntimeNameFromTemplate(template)}`}
                isSelected={
                  data.servingRuntimeTemplateName === getServingRuntimeNameFromTemplate(template) &&
                  data.scope === SERVING_RUNTIME_SCOPE.Project
                }
                onClick={() =>
                  setServingRuntimeTemplate({
                    template,
                    scope: SERVING_RUNTIME_SCOPE.Project,
                    currentScope: data.scope ?? '',
                    currentTemplateName: data.servingRuntimeTemplateName,
                    setData,
                    setDisplayName: setServingRuntimeDisplayName,
                    resetModelFormat,
                  })
                }
              >
                <Flex
                  spaceItems={{ default: 'spaceItemsXs' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                >
                  <FlexItem style={{ display: 'flex' }}>
                    <TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />
                  </FlexItem>
                  <FlexItem>
                    <Truncate content={getServingRuntimeDisplayNameFromTemplate(template)} />
                  </FlexItem>
                  <FlexItem align={{ default: 'alignRight' }}>
                    {compatibleIdentifiers?.some((identifier) =>
                      isCompatibleWithIdentifier(identifier, template.objects[0]),
                    ) && (
                      <Label color="blue">
                        Compatible with{' '}
                        {isHardwareProfilesAvailable ? 'hardware profile' : 'accelerator'}
                      </Label>
                    )}
                  </FlexItem>
                </Flex>
              </MenuItem>
            ))}
          </MenuGroup>
        )}
        {filteredProjectScopedTemplates.length > 0 && filteredScopedTemplates.length > 0 && (
          <Divider component="li" />
        )}
        {filteredScopedTemplates.length > 0 && (
          <MenuGroup
            data-testid="global-scoped-serving-runtimes"
            label={
              <Flex
                spaceItems={{ default: 'spaceItemsXs' }}
                alignItems={{ default: 'alignItemsCenter' }}
                style={{ paddingBottom: '5px' }}
              >
                <FlexItem
                  style={{ display: 'flex', paddingLeft: '12px' }}
                  data-testid="ds-project-image"
                >
                  <GlobalIcon style={{ height: '12px', width: '12px' }} />
                </FlexItem>
                <FlexItem>Global serving runtimes</FlexItem>
              </Flex>
            }
          >
            {filteredScopedTemplates.map((template, index) => (
              <MenuItem
                key={`servingRuntime-${index}`}
                data-testid={`servingRuntime ${getServingRuntimeNameFromTemplate(template)}`}
                isSelected={
                  data.servingRuntimeTemplateName === getServingRuntimeNameFromTemplate(template) &&
                  data.scope === SERVING_RUNTIME_SCOPE.Global
                }
                onClick={() =>
                  setServingRuntimeTemplate({
                    template,
                    scope: SERVING_RUNTIME_SCOPE.Global,
                    currentScope: data.scope ?? '',
                    currentTemplateName: data.servingRuntimeTemplateName,
                    setData,
                    setDisplayName: setServingRuntimeDisplayName,
                    resetModelFormat,
                  })
                }
                icon={<GlobalIcon />}
              >
                <Split>
                  <SplitItem isFilled>
                    <Truncate content={getServingRuntimeDisplayNameFromTemplate(template)} />
                  </SplitItem>
                  <SplitItem>
                    {compatibleIdentifiers?.some((identifier) =>
                      isCompatibleWithIdentifier(identifier, template.objects[0]),
                    ) && (
                      <Label color="blue">
                        Compatible with{' '}
                        {isHardwareProfilesAvailable ? 'hardware profile' : 'accelerator'}
                      </Label>
                    )}
                  </SplitItem>
                </Split>
              </MenuItem>
            ))}
          </MenuGroup>
        )}
        {filteredProjectScopedTemplates.length === 0 && filteredScopedTemplates.length === 0 && (
          <MenuItem isDisabled>No results found</MenuItem>
        )}
      </>
    );
  };

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
        <SearchSelector
          isFullWidth
          isDisabled={isEditing}
          dataTestId="serving-runtime-template-selection"
          onSearchChange={(newValue) => setSearchServingRuntime(newValue)}
          onSearchClear={() => setSearchServingRuntime('')}
          searchValue={searchServingRuntime}
          toggleContent={
            data.servingRuntimeTemplateName ? (
              <Flex gap={{ default: 'gapSm' }}>
                <FlexItem>
                  {isEditing ? data.servingRuntimeTemplateName : servingRuntimeDisplayName}{' '}
                </FlexItem>
                <FlexItem>
                  {data.scope === SERVING_RUNTIME_SCOPE.Project && (
                    <Label
                      variant={isEditing ? 'filled' : 'outline'}
                      style={{
                        border: isEditing
                          ? 'var( --pf-t--global--border--color--disabled) 1px solid'
                          : undefined,
                      }}
                      color={isEditing ? 'grey' : 'blue'}
                      data-testid="project-scoped-label"
                      isCompact
                      icon={<TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />}
                    >
                      Project-scoped
                    </Label>
                  )}
                  {data.scope === SERVING_RUNTIME_SCOPE.Global && (
                    <Label
                      variant={isEditing ? 'filled' : 'outline'}
                      style={{
                        border: isEditing
                          ? 'var( --pf-t--global--border--color--disabled) 1px solid'
                          : undefined,
                      }}
                      color={isEditing ? 'grey' : 'blue'}
                      isCompact
                      icon={<GlobalIcon />}
                      data-testid="global-scoped-label"
                    >
                      Global-scoped
                    </Label>
                  )}
                </FlexItem>
              </Flex>
            ) : (
              'Select one'
            )
          }
        >
          {getServingRuntime()}
        </SearchSelector>
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
            // Avoid onChange function is called twice
            // In KServe modal, it would set the model framework field to empty if there is only one option
            if (name !== data.servingRuntimeTemplateName) {
              setData('servingRuntimeTemplateName', name);
              // Reset model framework selection when changing the template in KServe modal only
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
