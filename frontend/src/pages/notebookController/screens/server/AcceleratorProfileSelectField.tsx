import * as React from 'react';
import {
  Alert,
  AlertVariant,
  FormGroup,
  HelperText,
  HelperTextItem,
  Icon,
  InputGroup,
  Label,
  List,
  ListItem,
  Popover,
  Skeleton,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Truncate,
  MenuItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import useAcceleratorCountWarning from '#~/pages/notebookController/screens/server/useAcceleratorCountWarning';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { AcceleratorProfileFormData } from '#~/utilities/useAcceleratorProfileFormState';
import ProjectScopedPopover from '#~/components/ProjectScopedPopover';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import useReadAcceleratorState, {
  AcceleratorProfileState,
} from '#~/utilities/useReadAcceleratorState';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import ProjectScopedIcon from '#~/components/searchSelector/ProjectScopedIcon';
import {
  ProjectScopedGroupLabel,
  ProjectScopedSearchDropdown,
} from '#~/components/searchSelector/ProjectScopedSearchDropdown';
import ProjectScopedToggleContent from '#~/components/searchSelector/ProjectScopedToggleContent';
import { ScopedType } from '#~/pages/modelServing/screens/const';

type AcceleratorProfileSelectFieldProps = {
  currentProject?: string;
  hasAdditionalPopoverInfo?: boolean;
  compatibleIdentifiers?: string[];
  resourceDisplayName?: string;
  infoContent?: string;
  initialState: AcceleratorProfileState;
  formData: AcceleratorProfileFormData;
  isRequired?: boolean;
  setFormData: UpdateObjectAtPropAndValue<AcceleratorProfileFormData>;
};

const AcceleratorProfileSelectField: React.FC<AcceleratorProfileSelectFieldProps> = ({
  compatibleIdentifiers,
  hasAdditionalPopoverInfo = false,
  resourceDisplayName = 'image',
  infoContent,
  initialState,
  formData,
  isRequired = false,
  setFormData,
  currentProject,
}) => {
  const acceleratorCountWarning = useAcceleratorCountWarning(
    formData.count,
    formData.profile?.spec.identifier,
  );

  const isAcceleratorProfileSupported = (cr: AcceleratorProfileKind) =>
    compatibleIdentifiers?.includes(cr.spec.identifier);

  const enabledAcceleratorProfiles = initialState.acceleratorProfiles.filter(
    (ac) => ac.spec.enabled,
  );
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [searchAcceleratorProfile, setSearchAcceleratorProfile] = React.useState('');
  const [
    currentProjectAcceleratorProfilesData,
    currentProjectAcceleratorProfilesLoaded,
    currentProjectAcceleratorProfilesError,
  ] = useReadAcceleratorState(undefined, undefined, undefined, currentProject);
  let currentProjectAcceleratorProfiles: AcceleratorProfileKind[] = [];
  if (currentProject) {
    currentProjectAcceleratorProfiles = currentProjectAcceleratorProfilesData.acceleratorProfiles;
  }
  const formatOption = (cr: AcceleratorProfileKind): SimpleSelectOption => {
    const displayName = `${cr.spec.displayName}${!cr.spec.enabled ? ' (disabled)' : ''}`;

    return {
      key: cr.metadata.name,
      label: displayName,
      description: cr.spec.description,
      dropdownLabel: (
        <Split>
          <SplitItem>{displayName}</SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            {isAcceleratorProfileSupported(cr) && (
              <Label color="blue">{`Compatible with ${resourceDisplayName}`}</Label>
            )}
          </SplitItem>
        </Split>
      ),
    };
  };

  const getProjectScopedAcceleratorProfiles = () =>
    currentProjectAcceleratorProfiles
      .filter((ac) => ac.spec.enabled)
      .toSorted((a, b) => {
        const aSupported = isAcceleratorProfileSupported(a);
        const bSupported = isAcceleratorProfileSupported(b);
        if (aSupported && !bSupported) {
          return -1;
        }
        if (!aSupported && bSupported) {
          return 1;
        }
        return 0;
      })
      .filter((profile) =>
        profile.spec.displayName
          .toLocaleLowerCase()
          .includes(searchAcceleratorProfile.toLocaleLowerCase()),
      );

  const getGlobalAcceleratorProfiles = () =>
    enabledAcceleratorProfiles
      .filter((ac) => ac.spec.enabled && ac.metadata.namespace !== currentProject)
      .toSorted((a, b) => {
        const aSupported = isAcceleratorProfileSupported(a);
        const bSupported = isAcceleratorProfileSupported(b);
        if (aSupported && !bSupported) {
          return -1;
        }
        if (!aSupported && bSupported) {
          return 1;
        }
        return 0;
      })
      .filter((profile) =>
        profile.spec.displayName
          .toLocaleLowerCase()
          .includes(searchAcceleratorProfile.toLocaleLowerCase()),
      );

  const renderMenuItem = (
    profile: AcceleratorProfileKind,
    index: number,
    scope: 'project' | 'global',
  ) => (
    <MenuItem
      key={`${index}-${scope}-accelerator-profile-${profile.metadata.name}`}
      isSelected={
        formData.profile?.metadata.name === profile.metadata.name &&
        formData.profile.metadata.namespace === profile.metadata.namespace
      }
      onClick={() => setFormData('profile', profile)}
      icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
      description={
        <Stack style={{ marginLeft: '19px' }}>
          {profile.spec.description && (
            <StackItem>
              <Truncate content={profile.spec.description} />
            </StackItem>
          )}
          {profile.spec.identifier && (
            <StackItem>
              <Truncate content={profile.spec.identifier} />
            </StackItem>
          )}
        </Stack>
      }
    >
      <Split>
        <SplitItem>{profile.spec.displayName}</SplitItem>
        <SplitItem isFilled />
        <SplitItem>
          {isAcceleratorProfileSupported(profile) && <Label color="blue">Compatible</Label>}
        </SplitItem>
      </Split>
    </MenuItem>
  );

  const extraMenuItems = (
    <>
      <MenuItem
        key="none"
        isSelected={!formData.profile}
        onClick={() => {
          setFormData('profile', undefined);
        }}
      >
        None
      </MenuItem>
      {initialState.unknownProfileDetected ? (
        <MenuItem
          key="unknown-existing"
          description="Use the existing accelerator settings from the notebook server"
          isSelected={!formData.profile}
          onClick={() => {
            setFormData('profile', undefined);
          }}
        >
          Existing settings
        </MenuItem>
      ) : formData.profile && !formData.profile.spec.enabled ? (
        <MenuItem
          key={formData.profile.metadata.name}
          description={formData.profile.spec.description}
          isSelected
          onClick={() => {
            setFormData('profile', formData.profile);
          }}
        >
          {formData.profile.spec.displayName}
        </MenuItem>
      ) : null}
    </>
  );

  const filteredProjectAcceleratorProfiles = getProjectScopedAcceleratorProfiles();
  const filteredGlobalAcceleratorProfiles = getGlobalAcceleratorProfiles();
  const hasProjectScopedAccelerators =
    isProjectScopedAvailable && currentProjectAcceleratorProfiles.length > 0;

  if (isProjectScopedAvailable && !currentProjectAcceleratorProfilesLoaded) {
    return <Skeleton />;
  }

  const options: SimpleSelectOption[] = enabledAcceleratorProfiles
    .toSorted((a, b) => {
      const aSupported = isAcceleratorProfileSupported(a);
      const bSupported = isAcceleratorProfileSupported(b);
      if (aSupported && !bSupported) {
        return -1;
      }
      if (!aSupported && bSupported) {
        return 1;
      }
      return 0;
    })
    .map((ac) => formatOption(ac));

  let acceleratorAlertMessage: { title: string; variant: AlertVariant } | null = null;
  if (formData.profile && compatibleIdentifiers !== undefined) {
    if (compatibleIdentifiers.length === 0) {
      acceleratorAlertMessage = {
        title: `The ${resourceDisplayName} you have selected doesn't support the selected accelerator. It is recommended to use a compatible ${resourceDisplayName} for optimal performance.`,
        variant: AlertVariant.info,
      };
    } else if (!isAcceleratorProfileSupported(formData.profile)) {
      acceleratorAlertMessage = {
        title: `The ${resourceDisplayName} you have selected is not compatible with the selected accelerator`,
        variant: AlertVariant.warning,
      };
    }
  }

  // add none option
  options.push({
    key: 'none',
    label: 'None',
  });

  if (initialState.unknownProfileDetected) {
    options.push({
      key: 'use-existing',
      label: 'Existing settings',
      description: 'Use the existing accelerator settings from the workbench',
    });
  } else if (formData.profile && !formData.profile.spec.enabled) {
    options.push(formatOption(formData.profile));
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup
          label="Accelerator"
          fieldId="modal-notebook-accelerator"
          isRequired={isRequired}
          labelHelp={
            hasProjectScopedAccelerators && !hasAdditionalPopoverInfo ? (
              <ProjectScopedPopover title="Accelerator profile" item="accelerator profiles" />
            ) : infoContent ? (
              <Popover
                bodyContent={
                  <div>
                    {infoContent}
                    {hasProjectScopedAccelerators && hasAdditionalPopoverInfo && (
                      <List>
                        <ListItem>
                          <b>Project-scoped accelerators</b> are accessible only within this
                          project.
                        </ListItem>
                        <ListItem>
                          <b>Global accelerators</b> are accessible across all projects.
                        </ListItem>
                      </List>
                    )}
                  </div>
                }
              >
                <Icon aria-label="Accelerator info" role="button">
                  <OutlinedQuestionCircleIcon />
                </Icon>
              </Popover>
            ) : undefined
          }
        >
          {isProjectScopedAvailable && currentProjectAcceleratorProfiles.length > 0 ? (
            <>
              <ProjectScopedSearchDropdown
                projectScopedItems={filteredProjectAcceleratorProfiles}
                globalScopedItems={filteredGlobalAcceleratorProfiles}
                renderMenuItem={renderMenuItem}
                searchValue={searchAcceleratorProfile}
                onSearchChange={setSearchAcceleratorProfile}
                onSearchClear={() => setSearchAcceleratorProfile('')}
                toggleContent={
                  <ProjectScopedToggleContent
                    displayName={formData.profile?.spec.displayName}
                    isProject={formData.profile?.metadata.namespace === currentProject}
                    projectLabel={ScopedType.Project}
                    globalLabel={ScopedType.Global}
                    fallback={
                      formData.useExistingSettings
                        ? 'Existing settings'
                        : !formData.profile && 'None'
                    }
                  />
                }
                projectGroupLabel={
                  <ProjectScopedGroupLabel isProject>
                    {ScopedType.Project} accelerator profiles
                  </ProjectScopedGroupLabel>
                }
                globalGroupLabel={
                  <ProjectScopedGroupLabel isProject={false}>
                    {ScopedType.Global} accelerator profiles
                  </ProjectScopedGroupLabel>
                }
                dataTestId="accelerator-profile-selection"
                projectGroupTestId="project-scoped-accelerator-profiles"
                globalGroupTestId="global-scoped-accelerator-profiles"
                isFullWidth
                extraMenuItems={extraMenuItems}
              />
              {initialState.unknownProfileDetected
                ? 'Use existing resource requests/limits, tolerations, and node selectors.'
                : null}
              {currentProjectAcceleratorProfilesError && (
                <HelperText isLiveRegion>
                  <HelperTextItem variant="error">
                    Error loading accelerator profiles
                  </HelperTextItem>
                </HelperText>
              )}
            </>
          ) : (
            <SimpleSelect
              isFullWidth
              options={options}
              value={
                formData.useExistingSettings
                  ? 'use-existing'
                  : formData.profile?.metadata.name ?? 'none'
              }
              onChange={(key) => {
                if (key === 'none') {
                  // none
                  setFormData('useExistingSettings', false);
                  setFormData('profile', undefined);
                  setFormData('count', 0);
                } else if (key === 'use-existing') {
                  // use existing settings
                  setFormData('useExistingSettings', true);
                  setFormData('profile', undefined);
                  setFormData('count', 0);
                } else {
                  // normal flow
                  setFormData('count', 1);
                  setFormData('useExistingSettings', false);
                  setFormData(
                    'profile',
                    initialState.acceleratorProfiles.find((ac) => ac.metadata.name === key),
                  );
                }
              }}
              dataTestId="accelerator-profile-select"
            />
          )}
        </FormGroup>
      </StackItem>
      {acceleratorAlertMessage && (
        <StackItem>
          <Alert
            isInline
            isPlain
            variant={acceleratorAlertMessage.variant}
            title={acceleratorAlertMessage.title}
          />
        </StackItem>
      )}
      {formData.profile && (
        <StackItem>
          <FormGroup label="Number of accelerators" fieldId="number-of-accelerators">
            <InputGroup>
              <NumberInputWrapper
                inputAriaLabel="Number of accelerators"
                id="number-of-accelerators"
                name="number-of-accelerators"
                value={formData.count}
                validated={acceleratorCountWarning ? 'warning' : 'default'}
                min={1}
                max={999}
                onChange={(value) => {
                  const newSize = Number(value);
                  setFormData('count', Math.max(Math.min(newSize, 999), 1));
                }}
              />
            </InputGroup>
          </FormGroup>
        </StackItem>
      )}
      {acceleratorCountWarning && (
        <StackItem>
          <Alert isInline isPlain variant="warning" title={acceleratorCountWarning} />
        </StackItem>
      )}
    </Stack>
  );
};

export default AcceleratorProfileSelectField;
