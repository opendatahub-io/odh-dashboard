import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Divider,
  Flex,
  FlexItem,
  FormGroup,
  HelperText,
  HelperTextItem,
  Icon,
  InputGroup,
  Label,
  List,
  ListItem,
  MenuGroup,
  MenuItem,
  Popover,
  Skeleton,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { AcceleratorProfileKind } from '~/k8sTypes';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { AcceleratorProfileFormData } from '~/utilities/useAcceleratorProfileFormState';
import ProjectScopedPopover from '~/components/ProjectScopedPopover';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import { ProjectObjectType } from '~/concepts/design/utils';
import GlobalIcon from '~/images/icons/GlobalIcon';
import useReadAcceleratorState, {
  AcceleratorProfileState,
} from '~/utilities/useReadAcceleratorState';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';
import useAcceleratorCountWarning from './useAcceleratorCountWarning';

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

  const getAcceleratorProfiles = () =>
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
      )
      .map((profile, index) => (
        <MenuItem
          key={`${index}-project-scoped`}
          isSelected={
            formData.profile?.metadata.name === profile.metadata.name &&
            formData.profile.metadata.namespace === profile.metadata.namespace
          }
          description={
            <Stack style={{ marginLeft: '23px' }}>
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
          onClick={() => {
            setFormData('profile', profile);
          }}
        >
          <Flex
            spaceItems={{ default: 'spaceItemsXs' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />
            </FlexItem>
            <FlexItem>{profile.spec.displayName} </FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              {isAcceleratorProfileSupported(profile) && <Label color="blue">Compatible</Label>}
            </FlexItem>
          </Flex>
        </MenuItem>
      ));

  const getDashboardAcceleratorProfiles = () => {
    const profileItems = enabledAcceleratorProfiles
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
      )
      .map((profile, index) => (
        <MenuItem
          key={`${index}-global`}
          description={
            <Stack style={{ marginLeft: '23px' }}>
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
          isSelected={
            formData.profile?.metadata.name === profile.metadata.name &&
            formData.profile.metadata.namespace === profile.metadata.namespace
          }
          icon={<GlobalIcon />}
          onClick={() => {
            setFormData('profile', profile);
          }}
        >
          <Split>
            <SplitItem>{profile.spec.displayName}</SplitItem>
            <SplitItem isFilled />
            <SplitItem>
              {isAcceleratorProfileSupported(profile) && <Label color="blue">Compatible</Label>}
            </SplitItem>
          </Split>
        </MenuItem>
      ));

    profileItems.push(
      <MenuItem
        key="none"
        isSelected={!formData.profile}
        onClick={() => {
          setFormData('profile', undefined);
        }}
      >
        None
      </MenuItem>,
    );

    if (initialState.unknownProfileDetected) {
      profileItems.push(
        <MenuItem
          key="unknown-existing"
          description="Use the existing accelerator settings from the notebook server"
          isSelected={!formData.profile}
          onClick={() => {
            setFormData('profile', undefined);
          }}
        >
          Existing settings
        </MenuItem>,
      );
    } else if (formData.profile && !formData.profile.spec.enabled) {
      profileItems.push(
        <MenuItem
          key={formData.profile.metadata.name}
          description={formData.profile.spec.description}
          isSelected
          onClick={() => {
            setFormData('profile', formData.profile);
          }}
        >
          {formData.profile.spec.displayName}
        </MenuItem>,
      );
    }

    return profileItems;
  };

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
      description: 'Use the existing accelerator settings from the notebook server',
    });
  } else if (formData.profile && !formData.profile.spec.enabled) {
    options.push(formatOption(formData.profile));
  }

  // if there is more than a none option, show the dropdown
  if (options.length === 1) {
    return null;
  }

  const filteredAcceleratorProfiles = getAcceleratorProfiles();
  const filteredDashboardAcceleratorProfiles = getDashboardAcceleratorProfiles();
  const hasProjectScopedAccelerators =
    isProjectScopedAvailable && currentProjectAcceleratorProfiles.length > 0;

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
              <SearchSelector
                isFullWidth
                dataTestId="accelerator-profile-selection"
                onSearchChange={(newValue) => setSearchAcceleratorProfile(newValue)}
                onSearchClear={() => setSearchAcceleratorProfile('')}
                searchValue={searchAcceleratorProfile}
                toggleContent={
                  formData.profile?.spec.displayName ? (
                    <Flex gap={{ default: 'gapSm' }}>
                      <FlexItem>{formData.profile.spec.displayName}</FlexItem>
                      <FlexItem>
                        {formData.profile.metadata.namespace === currentProject ? (
                          <Label
                            variant="outline"
                            color="blue"
                            data-testid="project-scoped-label"
                            isCompact
                            icon={
                              <TypedObjectIcon alt="" resourceType={ProjectObjectType.project} />
                            }
                          >
                            Project-scoped
                          </Label>
                        ) : (
                          <Label
                            variant="outline"
                            color="blue"
                            data-testid="global-scoped-label"
                            isCompact
                            icon={<GlobalIcon />}
                          >
                            Global-scoped
                          </Label>
                        )}
                      </FlexItem>
                    </Flex>
                  ) : formData.useExistingSettings ? (
                    'Existing settings'
                  ) : (
                    !formData.profile && 'None'
                  )
                }
              >
                <>
                  {filteredAcceleratorProfiles.length > 0 && (
                    <>
                      <MenuGroup
                        key="project-scoped"
                        data-testid="project-scoped-accelerator-profiles"
                        label={
                          <Flex
                            spaceItems={{ default: 'spaceItemsXs' }}
                            alignItems={{ default: 'alignItemsCenter' }}
                          >
                            <FlexItem style={{ display: 'flex', paddingLeft: '12px' }}>
                              <TypedObjectIcon
                                style={{ height: '12px', width: '12px' }}
                                alt=""
                                resourceType={ProjectObjectType.project}
                              />
                            </FlexItem>
                            <FlexItem>Project-scoped accelerator profiles</FlexItem>
                          </Flex>
                        }
                      >
                        {filteredAcceleratorProfiles}
                      </MenuGroup>
                    </>
                  )}
                  {filteredDashboardAcceleratorProfiles.length > 0 &&
                    filteredDashboardAcceleratorProfiles.length > 0 && <Divider component="li" />}
                  {filteredDashboardAcceleratorProfiles.length > 0 && (
                    <>
                      <MenuGroup
                        key="global-scoped"
                        data-testid="global-scoped-accelerator-profiles"
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
                            <FlexItem>Global accelerator profiles</FlexItem>
                          </Flex>
                        }
                      >
                        {filteredDashboardAcceleratorProfiles}
                      </MenuGroup>
                    </>
                  )}
                  {filteredAcceleratorProfiles.length === 0 &&
                    filteredDashboardAcceleratorProfiles.length === 0 && (
                      <MenuItem isDisabled>No results found</MenuItem>
                    )}
                </>
              </SearchSelector>
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
