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
import { HardwareProfileKind, IdentifierResourceType, TemplateKind } from '@odh-dashboard/k8s-core';
import { ScopedType } from '@odh-dashboard/internal/pages/modelServing/screens/const';
import ProjectScopedPopover from '@odh-dashboard/internal/components/ProjectScopedPopover';
import ProjectScopedIcon from '@odh-dashboard/internal/components/searchSelector/ProjectScopedIcon';
import {
  ProjectScopedGroupLabel,
  ProjectScopedSearchDropdown,
} from '@odh-dashboard/internal/components/searchSelector/ProjectScopedSearchDropdown';
import ProjectScopedToggleContent from '@odh-dashboard/internal/components/searchSelector/ProjectScopedToggleContent';
import ServingRuntimeVersionLabel from '@odh-dashboard/internal/pages/modelServing/screens/ServingRuntimeVersionLabel';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

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

export type ModelServerSelectField = {
  data?: ModelServerSelectFieldData;
  setData?: (data: ModelServerSelectFieldData) => void;
  options?: ModelServerOption[];
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
  modelServerState: ModelServerSelectField &
    Required<Pick<ModelServerSelectField, 'setData' | 'options'>>;
  isEditing?: boolean;
  label?: string;
};

const ModelServerTemplateSelectField: React.FC<ModelServerTemplateSelectFieldProps> = ({
  modelServerState,
  isEditing,
  label = 'Deployment resource',
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
            label={
              <>
                <span className="pf-v6-c-form__label-text">Automatic selection:</span> Automatically
                select the best resource for my model based on model type, model format and hardware
                profile.
              </>
            }
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
            label={
              <>
                <span className="pf-v6-c-form__label-text">Manual selection:</span> Manually select
                a resource from a list of preconfigured and custom options.
              </>
            }
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
