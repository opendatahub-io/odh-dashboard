import {
  Flex,
  FlexItem,
  HelperTextItem,
  HelperText,
  Label,
  Split,
  SplitItem,
  Truncate,
  Stack,
  StackItem,
  Skeleton,
  Divider,
  MenuGroup,
  MenuItem,
  FormHelperText,
} from '@patternfly/react-core';
import * as React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { HardwareProfileKind } from '~/k8sTypes';
import SearchSelector from '~/components/searchSelector/SearchSelector';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import GlobalIcon from '~/images/icons/GlobalIcon';
import TruncatedText from '~/components/TruncatedText';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import { formatResource, formatResourceValue, getProfileScore } from './utils';

type HardwareProfileSelectProps = {
  initialHardwareProfile?: HardwareProfileKind;
  previewDescription?: boolean;
  hardwareProfiles: HardwareProfileKind[];
  hardwareProfilesLoaded: boolean;
  hardwareProfilesError: Error | undefined;
  projectScopedHardwareProfiles: [
    data: HardwareProfileKind[],
    loaded: boolean,
    loadError: Error | undefined,
    refresh: () => Promise<void>,
  ];
  allowExistingSettings: boolean;
  hardwareProfileConfig: HardwareProfileConfig;
  isHardwareProfileSupported: (profile: HardwareProfileKind) => boolean;
  onChange: (profile: HardwareProfileKind | undefined) => void;
  project?: string;
};

const EXISTING_SETTINGS_KEY = '.existing';

const HardwareProfileSelect: React.FC<HardwareProfileSelectProps> = ({
  initialHardwareProfile,
  previewDescription = false,
  hardwareProfiles,
  hardwareProfilesLoaded,
  hardwareProfilesError,
  projectScopedHardwareProfiles,
  allowExistingSettings = false,
  hardwareProfileConfig,
  isHardwareProfileSupported,
  onChange,
  project,
}) => {
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const [searchHardwareProfile, setSearchHardwareProfile] = React.useState('');
  const [
    currentProjectHardwareProfiles,
    currentProjectHardwareProfilesLoaded,
    currentProjectHardwareProfilesError,
  ] = projectScopedHardwareProfiles;

  const options = React.useMemo(() => {
    const enabledProfiles = hardwareProfiles
      .filter((hp) => hp.spec.enabled)
      .toSorted((a, b) => {
        // First compare by whether they have extra resources
        const aHasExtra = (a.spec.identifiers ?? []).length > 2;
        const bHasExtra = (b.spec.identifiers ?? []).length > 2;

        // If one has extra resources and the other doesn't, sort the extra resources one later
        if (aHasExtra !== bHasExtra) {
          return aHasExtra ? 1 : -1;
        }

        // If they're the same (both have or both don't have extra resources),
        // then sort by their score
        return getProfileScore(a) - getProfileScore(b);
      });

    // allow continued use of already selected profile if it is disabled
    if (initialHardwareProfile && !initialHardwareProfile.spec.enabled) {
      enabledProfiles.push(initialHardwareProfile);
    }

    const formattedOptions: SimpleSelectOption[] = enabledProfiles.map((profile) => {
      const displayName = `${profile.spec.displayName}${
        !profile.spec.enabled ? ' (disabled)' : ''
      }`;

      return {
        key: profile.metadata.name,
        label: displayName,
        description: (
          <Stack>
            {profile.spec.description && (
              <StackItem>
                <Truncate content={profile.spec.description} />
              </StackItem>
            )}
            {profile.spec.identifiers && (
              <StackItem>
                <Truncate
                  content={profile.spec.identifiers
                    .map((identifier) => {
                      const resourceValue = formatResourceValue(
                        identifier.defaultCount,
                        identifier.resourceType,
                      ).toString();
                      return formatResource(identifier.displayName, resourceValue, resourceValue);
                    })
                    .join('; ')}
                />
              </StackItem>
            )}
          </Stack>
        ),
        dropdownLabel: (
          <Split>
            <SplitItem>{displayName}</SplitItem>
            <SplitItem isFilled />
            <SplitItem>
              {isHardwareProfileSupported(profile) && <Label color="blue">Compatible</Label>}
            </SplitItem>
          </Split>
        ),
      };
    });

    // allow usage of existing settings if no hardware profile is found
    if (allowExistingSettings) {
      formattedOptions.push({
        key: EXISTING_SETTINGS_KEY,
        label: 'Use existing settings',
        description: 'Use existing resource requests/limits, tolerations, and node selectors.',
      });
    }

    return formattedOptions;
  }, [hardwareProfiles, initialHardwareProfile, allowExistingSettings, isHardwareProfileSupported]);

  const getHardwareProfiles = () => {
    const currentProjectEnabledProfiles = currentProjectHardwareProfiles
      .filter((hp) => hp.spec.enabled)
      .toSorted((a, b) => {
        // First compare by whether they have extra resources
        const aHasExtra = (a.spec.identifiers ?? []).length > 2;
        const bHasExtra = (b.spec.identifiers ?? []).length > 2;

        // If one has extra resources and the other doesn't, sort the extra resources one later
        if (aHasExtra !== bHasExtra) {
          return aHasExtra ? 1 : -1;
        }

        // If they're the same (both have or both don't have extra resources),
        // then sort by their score
        return getProfileScore(a) - getProfileScore(b);
      });

    // allow continued use of already selected profile if it is disabled
    if (initialHardwareProfile && !initialHardwareProfile.spec.enabled) {
      currentProjectEnabledProfiles.push(initialHardwareProfile);
    }

    const formattedOptions = currentProjectEnabledProfiles
      .filter((profile) =>
        profile.spec.displayName
          .toLocaleLowerCase()
          .includes(searchHardwareProfile.toLocaleLowerCase()),
      )
      .map((profile, index) => {
        const displayName = `${profile.spec.displayName}${
          !profile.spec.enabled ? ' (disabled)' : ''
        }`;

        return (
          <MenuItem
            key={index}
            isSelected={
              profile.metadata.name === hardwareProfileConfig.selectedProfile?.metadata.name &&
              profile.metadata.namespace ===
                hardwareProfileConfig.selectedProfile.metadata.namespace
            }
            description={
              <Stack style={{ marginLeft: '23px' }}>
                {profile.spec.description && (
                  <StackItem>
                    <Truncate content={profile.spec.description} />
                  </StackItem>
                )}
                {profile.spec.identifiers && (
                  <StackItem>
                    <Truncate
                      content={profile.spec.identifiers
                        .map((identifier) =>
                          formatResource(
                            identifier.displayName,
                            identifier.defaultCount.toString(),
                            identifier.defaultCount.toString(),
                          ),
                        )
                        .join('; ')}
                    />
                  </StackItem>
                )}
              </Stack>
            }
            onClick={() => {
              onChange(profile);
            }}
          >
            <Flex
              spaceItems={{ default: 'spaceItemsXs' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem style={{ display: 'flex' }}>
                <img
                  style={{ height: '20px' }}
                  src={typedObjectImage(ProjectObjectType.project)}
                  alt=""
                />
              </FlexItem>
              <FlexItem>
                <Truncate content={displayName} />
              </FlexItem>
              <FlexItem align={{ default: 'alignRight' }}>
                {isHardwareProfileSupported(profile) && <Label color="blue">Compatible</Label>}
              </FlexItem>
            </Flex>
          </MenuItem>
        );
      });

    return formattedOptions;
  };

  const getDashboardHardwareProfiles = () => {
    const DahboardEnabledProfiles = hardwareProfiles
      .filter((hp) => hp.spec.enabled)
      .toSorted((a, b) => {
        // First compare by whether they have extra resources
        const aHasExtra = (a.spec.identifiers ?? []).length > 2;
        const bHasExtra = (b.spec.identifiers ?? []).length > 2;

        // If one has extra resources and the other doesn't, sort the extra resources one later
        if (aHasExtra !== bHasExtra) {
          return aHasExtra ? 1 : -1;
        }

        // If they're the same (both have or both don't have extra resources),
        // then sort by their score
        return getProfileScore(a) - getProfileScore(b);
      });

    // allow continued use of already selected profile if it is disabled
    if (initialHardwareProfile && !initialHardwareProfile.spec.enabled) {
      DahboardEnabledProfiles.push(initialHardwareProfile);
    }

    const formattedOptions = DahboardEnabledProfiles.filter((profile) =>
      profile.spec.displayName
        .toLocaleLowerCase()
        .includes(searchHardwareProfile.toLocaleLowerCase()),
    ).map((profile, index) => {
      const displayName = `${profile.spec.displayName}${
        !profile.spec.enabled ? ' (disabled)' : ''
      }`;

      return (
        <MenuItem
          key={index}
          isSelected={
            profile.metadata.name === hardwareProfileConfig.selectedProfile?.metadata.name &&
            profile.metadata.namespace === hardwareProfileConfig.selectedProfile.metadata.namespace
          }
          description={
            <Stack style={{ marginLeft: '23px' }}>
              {profile.spec.description && (
                <StackItem>
                  <Truncate content={profile.spec.description} />
                </StackItem>
              )}
              {profile.spec.identifiers && (
                <StackItem>
                  <Truncate
                    content={profile.spec.identifiers
                      .map((identifier) =>
                        formatResource(
                          identifier.displayName,
                          identifier.defaultCount.toString(),
                          identifier.defaultCount.toString(),
                        ),
                      )
                      .join('; ')}
                  />
                </StackItem>
              )}
            </Stack>
          }
          icon={<GlobalIcon />}
          onClick={() => {
            onChange(profile);
          }}
        >
          <Split>
            <SplitItem>{displayName}</SplitItem>
            <SplitItem isFilled />
            <SplitItem>
              {isHardwareProfileSupported(profile) && <Label color="blue">Compatible</Label>}
            </SplitItem>
          </Split>
        </MenuItem>
      );
    });

    if (allowExistingSettings) {
      formattedOptions.push(
        <MenuItem
          style={{ marginLeft: '23px' }}
          isSelected={
            hardwareProfileConfig.useExistingSettings && !hardwareProfileConfig.selectedProfile
          }
          description="Use existing resource requests/limits, tolerations, and node selectors."
          onClick={() => onChange(undefined)}
        >
          Use existing settings
        </MenuItem>,
      );
    }

    return formattedOptions;
  };

  if (isProjectScoped && !currentProjectHardwareProfilesLoaded && !hardwareProfilesLoaded) {
    return <Skeleton />;
  }

  return (
    <>
      <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem grow={{ default: 'grow' }}>
          {isProjectScoped && currentProjectHardwareProfiles.length > 0 ? (
            <>
              <SearchSelector
                isFullWidth
                dataTestId="hardware-profile-selection"
                onSearchChange={(newValue) => setSearchHardwareProfile(newValue)}
                onSearchClear={() => setSearchHardwareProfile('')}
                searchValue={searchHardwareProfile}
                toggleContent={
                  hardwareProfileConfig.selectedProfile?.spec.displayName ? (
                    <>
                      {hardwareProfileConfig.selectedProfile.spec.displayName}
                      {'  '}
                      {hardwareProfileConfig.selectedProfile.metadata.namespace === project ? (
                        <Label
                          variant="outline"
                          color="blue"
                          data-testid="project-scoped-label"
                          isCompact
                          icon={
                            <img
                              style={{ height: '15px', paddingTop: '3px' }}
                              src={typedObjectImage(ProjectObjectType.project)}
                              alt=""
                            />
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
                    </>
                  ) : allowExistingSettings ? (
                    'Use existing settings'
                  ) : (
                    'Select hardware profile...'
                  )
                }
              >
                <>
                  <MenuGroup
                    key="project-scoped"
                    data-testid="project-scoped-hardware-profiles"
                    label={
                      <Flex
                        spaceItems={{ default: 'spaceItemsXs' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                        style={{ paddingBottom: '5px' }}
                      >
                        <FlexItem style={{ display: 'flex', paddingLeft: '12px' }}>
                          <img
                            style={{ height: '20px', paddingTop: '3px' }}
                            src={typedObjectImage(ProjectObjectType.project)}
                            alt=""
                          />
                        </FlexItem>
                        <FlexItem>Project-scoped Hardware profiles</FlexItem>
                      </Flex>
                    }
                  >
                    {getHardwareProfiles()}
                  </MenuGroup>

                  <Divider component="li" />
                  <MenuGroup
                    key="global-scoped"
                    data-testid="global-scoped-hardware-profiles"
                    label={
                      <Flex
                        spaceItems={{ default: 'spaceItemsXs' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                        style={{ paddingBottom: '5px' }}
                      >
                        <FlexItem
                          style={{ display: 'flex', paddingLeft: '10px' }}
                          data-testid="ds-project-image"
                        >
                          <GlobalIcon />
                        </FlexItem>
                        <FlexItem>Global hardware profiles</FlexItem>
                      </Flex>
                    }
                  >
                    {getDashboardHardwareProfiles()}
                  </MenuGroup>
                </>
              </SearchSelector>
              {previewDescription &&
              (hardwareProfileConfig.selectedProfile?.spec.description ||
                hardwareProfileConfig.selectedProfile?.spec.identifiers) ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      <TruncatedText
                        maxLines={2}
                        content={
                          hardwareProfileConfig.selectedProfile.spec.description ||
                          (hardwareProfileConfig.selectedProfile.spec.identifiers &&
                            hardwareProfileConfig.selectedProfile.spec.identifiers
                              .map((identifier) =>
                                formatResource(
                                  identifier.displayName,
                                  identifier.defaultCount.toString(),
                                  identifier.defaultCount.toString(),
                                ),
                              )
                              .join('; '))
                        }
                      />
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : hardwareProfileConfig.useExistingSettings ? (
                'Use existing resource requests/limits, tolerations, and node selectors.'
              ) : null}
              {(hardwareProfilesError || currentProjectHardwareProfilesError) && (
                <HelperText isLiveRegion>
                  <HelperTextItem variant="error">Error loading hardware profiles</HelperTextItem>
                </HelperText>
              )}
            </>
          ) : (
            <>
              <SimpleSelect
                dataTestId="hardware-profile-select"
                previewDescription={previewDescription}
                options={options}
                value={
                  hardwareProfileConfig.selectedProfile?.metadata.name ??
                  (hardwareProfileConfig.useExistingSettings ? EXISTING_SETTINGS_KEY : undefined)
                }
                onChange={(key) => {
                  if (key === EXISTING_SETTINGS_KEY) {
                    onChange(undefined);
                  } else {
                    const profile = hardwareProfiles.find((hp) => hp.metadata.name === key);
                    if (profile) {
                      onChange(profile);
                    }
                  }
                }}
                placeholder={
                  options.length > 0
                    ? 'Select hardware profile...'
                    : hardwareProfilesError
                    ? 'Error loading hardware profiles'
                    : 'No enabled or valid hardware profiles are available. Contact your administrator.'
                }
                isFullWidth
                isSkeleton={!hardwareProfilesLoaded && !hardwareProfilesError}
                isScrollable
              />
              {hardwareProfilesError && (
                <HelperText isLiveRegion>
                  <HelperTextItem variant="error">Error loading hardware profiles</HelperTextItem>
                </HelperText>
              )}
            </>
          )}
        </FlexItem>
        <FlexItem>
          {options.length > 0 && (
            <HardwareProfileDetailsPopover
              hardwareProfile={hardwareProfileConfig.selectedProfile}
              tolerations={hardwareProfileConfig.selectedProfile?.spec.tolerations}
              nodeSelector={hardwareProfileConfig.selectedProfile?.spec.nodeSelector}
              resources={hardwareProfileConfig.resources}
            />
          )}
        </FlexItem>
      </Flex>
    </>
  );
};

export default HardwareProfileSelect;
