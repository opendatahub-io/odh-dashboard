import {
  Flex,
  FlexItem,
  HelperTextItem,
  HelperText,
  Icon,
  Label,
  Split,
  SplitItem,
  Tooltip,
  Truncate,
  Stack,
  StackItem,
  Skeleton,
  MenuItem,
  FormHelperText,
} from '@patternfly/react-core';
import * as React from 'react';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { t_global_icon_color_disabled as disabledIconColor } from '@patternfly/react-tokens';
import { type HardwareProfileKind, byName } from '@odh-dashboard/k8s-core';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
import ProjectScopedIcon from '@odh-dashboard/ui-core/components/searchSelector/ProjectScopedIcon';
import { DashboardPopupIconButton } from '@odh-dashboard/ui-core';
import {
  ProjectScopedGroupLabel,
  ProjectScopedSearchDropdown,
} from '@odh-dashboard/ui-core/components/searchSelector/ProjectScopedSearchDropdown';
import ProjectScopedToggleContent from '@odh-dashboard/ui-core/components/searchSelector/ProjectScopedToggleContent';
import {
  getHardwareProfileDescription,
  getHardwareProfileDisplayName,
  isHardwareProfileEnabled,
  orderHardwareProfiles,
} from '@odh-dashboard/internal/pages/hardwareProfiles/utils';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useApplicationSettings } from '@odh-dashboard/internal/app/useApplicationSettings';
import {
  computeLocalQueueNamesResult,
  filterProfilesByKueue,
  KueueFilteringState,
  useKueueConfiguration,
} from './kueueUtils';
import { formatResource, formatResourceValue } from './utils';
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';

type HardwareProfileSelectProps = {
  initialHardwareProfile?: HardwareProfileKind;
  previewDescription?: boolean;
  hardwareProfiles: HardwareProfileKind[];
  isProjectScoped: boolean;
  hardwareProfilesLoaded: boolean;
  hardwareProfilesError: Error | undefined;
  projectScopedHardwareProfiles: [
    data: HardwareProfileKind[],
    loaded: boolean,
    loadError: Error | undefined,
  ];
  allowExistingSettings: boolean;
  hardwareProfileConfig: HardwareProfileConfig;
  isHardwareProfileSupported: (profile: HardwareProfileKind) => boolean;
  onChange: (profile: HardwareProfileKind | undefined) => void;
  project?: string;
};

const EXISTING_SETTINGS_KEY = '.existing';
const TOOLTIP_MAX_LINES = 30;

const HardwareProfileSelect: React.FC<HardwareProfileSelectProps> = ({
  initialHardwareProfile,
  previewDescription = false,
  hardwareProfiles,
  isProjectScoped,
  hardwareProfilesLoaded,
  hardwareProfilesError,
  projectScopedHardwareProfiles,
  allowExistingSettings = false,
  hardwareProfileConfig,
  isHardwareProfileSupported,
  onChange,
  project,
}) => {
  const [searchHardwareProfile, setSearchHardwareProfile] = React.useState('');
  const [
    currentProjectHardwareProfiles,
    currentProjectHardwareProfilesLoaded,
    currentProjectHardwareProfilesError,
  ] = projectScopedHardwareProfiles;

  const { currentProject, localQueues } = React.useContext(ProjectDetailsContext);
  const { projects } = React.useContext(ProjectsContext);
  const { dashboardConfig } = useApplicationSettings();
  const hardwareProfileOrder = React.useMemo(
    () => dashboardConfig?.spec.hardwareProfileOrder || [],
    [dashboardConfig?.spec.hardwareProfileOrder],
  );

  const projectForKueue = React.useMemo(() => {
    if (project) {
      return projects.find(byName(project));
    }
    return currentProject.metadata.name ? currentProject : undefined;
  }, [project, projects, currentProject]);

  const { kueueFilteringState } = useKueueConfiguration(projectForKueue);

  const { data: lqData, loaded: lqLoaded, error: lqError } = localQueues;
  const localQueueNamesResult = React.useMemo(
    () => computeLocalQueueNamesResult({ data: lqData, loaded: lqLoaded, error: lqError }),
    [lqData, lqLoaded, lqError],
  );
  const availableLocalQueueNames =
    localQueueNamesResult.status === 'ready' ? localQueueNamesResult.names : undefined;

  const isQueueMissing = React.useCallback(
    (profile: HardwareProfileKind): boolean => {
      const localQueueName = profile.spec.scheduling?.kueue?.localQueueName;
      if (!localQueueName || !availableLocalQueueNames) {
        return false;
      }
      return !availableLocalQueueNames.has(localQueueName);
    },
    [availableLocalQueueNames],
  );

  const options = React.useMemo(() => {
    const enabledProfiles = orderHardwareProfiles(
      filterProfilesByKueue(
        hardwareProfiles.filter(isHardwareProfileEnabled),
        kueueFilteringState,
        availableLocalQueueNames,
      ),
      hardwareProfileOrder,
    );

    if (initialHardwareProfile && !enabledProfiles.includes(initialHardwareProfile)) {
      enabledProfiles.push(initialHardwareProfile);
    }

    const formattedOptions: SimpleSelectOption[] = enabledProfiles.map((profile) => {
      const displayName = `${getHardwareProfileDisplayName(profile)}${
        !isHardwareProfileEnabled(profile) ? ' (disabled)' : ''
      }`;
      const description = getHardwareProfileDescription(profile);
      const queueMissing = profile === initialHardwareProfile && isQueueMissing(profile);

      return {
        key: profile.metadata.name,
        label: displayName,
        description: (
          <Stack>
            {description && (
              <StackItem>
                <TruncatedText
                  maxLines={1}
                  tooltipMaxLines={TOOLTIP_MAX_LINES}
                  content={description}
                />
              </StackItem>
            )}
            {profile.spec.identifiers && (
              <StackItem>
                <Truncate
                  content={profile.spec.identifiers
                    .map((identifier) => {
                      const defaultVal = formatResourceValue(
                        identifier.defaultCount,
                        identifier.resourceType,
                      ).toString();
                      const maxVal =
                        identifier.maxCount === undefined
                          ? 'unrestricted'
                          : formatResourceValue(
                              identifier.maxCount,
                              identifier.resourceType,
                            ).toString();
                      return formatResource(identifier.displayName, defaultVal, maxVal);
                    })
                    .join('; ')}
                />
              </StackItem>
            )}
            {profile.spec.scheduling?.kueue?.localQueueName && (
              <StackItem>
                <Truncate
                  content={`Local queue: ${profile.spec.scheduling.kueue.localQueueName}${
                    profile.spec.scheduling.kueue.priorityClass
                      ? `; Priority: ${profile.spec.scheduling.kueue.priorityClass}`
                      : ''
                  }`}
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
            {queueMissing && (
              <SplitItem>
                <Tooltip content="The local queue for this profile is no longer available in this project.">
                  <DashboardPopupIconButton
                    aria-label="Local queue unavailable"
                    data-testid="queue-missing-icon"
                    icon={<InfoCircleIcon color={disabledIconColor.value} />}
                  />
                </Tooltip>
              </SplitItem>
            )}
          </Split>
        ),
      };
    });

    if (allowExistingSettings) {
      formattedOptions.unshift({
        key: EXISTING_SETTINGS_KEY,
        label: 'Use existing settings',
        description: 'Use existing resource requests/limits, tolerations, and node selectors.',
      });
    }

    return formattedOptions;
  }, [
    hardwareProfiles,
    initialHardwareProfile,
    allowExistingSettings,
    isHardwareProfileSupported,
    isQueueMissing,
    availableLocalQueueNames,
    kueueFilteringState,
    hardwareProfileOrder,
  ]);

  const renderMenuItem = (
    profile: HardwareProfileKind,
    index: number,
    scope: 'project' | 'global',
  ) => {
    const description = getHardwareProfileDescription(profile);
    const queueMissing = profile === initialHardwareProfile && isQueueMissing(profile);
    return (
      <MenuItem
        key={`${index}-${scope}-hardware-profile-${profile.metadata.name}`}
        isSelected={
          profile.metadata.name === hardwareProfileConfig.selectedProfile?.metadata.name &&
          profile.metadata.namespace === hardwareProfileConfig.selectedProfile.metadata.namespace
        }
        onClick={() => onChange(profile)}
        icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
        description={
          <Stack style={{ marginLeft: '19px' }}>
            {description && (
              <StackItem>
                <Truncate content={description} />
              </StackItem>
            )}
            {profile.spec.identifiers && (
              <StackItem>
                <Truncate
                  content={profile.spec.identifiers
                    .map((identifier) => {
                      const defaultVal = formatResourceValue(
                        identifier.defaultCount,
                        identifier.resourceType,
                      ).toString();
                      const maxVal =
                        identifier.maxCount === undefined
                          ? 'unrestricted'
                          : formatResourceValue(
                              identifier.maxCount,
                              identifier.resourceType,
                            ).toString();
                      return formatResource(identifier.displayName, defaultVal, maxVal);
                    })
                    .join('; ')}
                />
              </StackItem>
            )}
            {profile.spec.scheduling?.kueue?.localQueueName && (
              <StackItem>
                <Truncate
                  content={`Local queue: ${profile.spec.scheduling.kueue.localQueueName}${
                    profile.spec.scheduling.kueue.priorityClass
                      ? `; Priority: ${profile.spec.scheduling.kueue.priorityClass}`
                      : ''
                  }`}
                />
              </StackItem>
            )}
          </Stack>
        }
      >
        <Split>
          <SplitItem>{getHardwareProfileDisplayName(profile)}</SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            {isHardwareProfileSupported(profile) && <Label color="blue">Compatible</Label>}
          </SplitItem>
          {queueMissing && (
            <SplitItem>
              <Tooltip content="The local queue for this profile is no longer available in this project.">
                <DashboardPopupIconButton
                  aria-label="Local queue unavailable"
                  data-testid="queue-missing-icon"
                  icon={<InfoCircleIcon color={disabledIconColor.value} />}
                />
              </Tooltip>
            </SplitItem>
          )}
        </Split>
      </MenuItem>
    );
  };

  const processHardwareProfilesForSelection = (profiles: HardwareProfileKind[]) => {
    const filteredProfiles = filterProfilesByKueue(
      profiles.filter(isHardwareProfileEnabled),
      kueueFilteringState,
      availableLocalQueueNames,
    );
    // Rescue only in the group the profile came from, to avoid showing it in both sections.
    if (
      initialHardwareProfile &&
      profiles.includes(initialHardwareProfile) &&
      !filteredProfiles.includes(initialHardwareProfile)
    ) {
      filteredProfiles.push(initialHardwareProfile);
    }
    return orderHardwareProfiles(filteredProfiles, hardwareProfileOrder).filter((profile) =>
      getHardwareProfileDisplayName(profile)
        .toLocaleLowerCase()
        .includes(searchHardwareProfile.toLocaleLowerCase()),
    );
  };

  const projectHardwareProfiles = processHardwareProfilesForSelection(
    currentProjectHardwareProfiles,
  );

  const globalHardwareProfiles = processHardwareProfilesForSelection(hardwareProfiles);

  if (isProjectScoped && !currentProjectHardwareProfilesLoaded && !hardwareProfilesLoaded) {
    return <Skeleton />;
  }

  const kueueFilteringInfoHelper =
    kueueFilteringState === KueueFilteringState.ONLY_KUEUE_PROFILES ? (
      <FormHelperText>
        <HelperText>
          <HelperTextItem
            icon={
              <Icon status="info">
                <InfoCircleIcon />
              </Icon>
            }
            data-testid="kueue-filtering-info"
          >
            Only hardware profiles configured with a local queue are shown because this project uses
            Kueue for workload scheduling.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    ) : null;

  return (
    <>
      <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem grow={{ default: 'grow' }}>
          {isProjectScoped && currentProjectHardwareProfiles.length > 0 ? (
            <>
              <ProjectScopedSearchDropdown
                projectScopedItems={projectHardwareProfiles}
                globalScopedItems={globalHardwareProfiles}
                renderMenuItem={renderMenuItem}
                searchValue={searchHardwareProfile}
                onSearchChange={setSearchHardwareProfile}
                onSearchClear={() => setSearchHardwareProfile('')}
                toggleContent={
                  <ProjectScopedToggleContent
                    displayName={
                      hardwareProfileConfig.selectedProfile
                        ? getHardwareProfileDisplayName(hardwareProfileConfig.selectedProfile)
                        : undefined
                    }
                    isProject={
                      hardwareProfileConfig.selectedProfile?.metadata.namespace === project
                    }
                    projectLabel="Project-scoped"
                    globalLabel="Global-scoped"
                    fallback={
                      allowExistingSettings ? 'Use existing settings' : 'Select hardware profile...'
                    }
                  />
                }
                projectGroupLabel={
                  <ProjectScopedGroupLabel isProject>
                    Project-scoped hardware profiles
                  </ProjectScopedGroupLabel>
                }
                globalGroupLabel={
                  <ProjectScopedGroupLabel isProject={false}>
                    Global-scoped hardware profiles
                  </ProjectScopedGroupLabel>
                }
                dataTestId="hardware-profile-selection"
                projectGroupTestId="project-scoped-hardware-profiles"
                globalGroupTestId="global-scoped-hardware-profiles"
                isFullWidth
              />
              {previewDescription &&
              hardwareProfileConfig.selectedProfile &&
              (getHardwareProfileDescription(hardwareProfileConfig.selectedProfile) ||
                hardwareProfileConfig.selectedProfile.spec.identifiers) ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      <TruncatedText
                        maxLines={2}
                        tooltipMaxLines={TOOLTIP_MAX_LINES}
                        content={
                          getHardwareProfileDescription(hardwareProfileConfig.selectedProfile) ||
                          (hardwareProfileConfig.selectedProfile.spec.identifiers &&
                            hardwareProfileConfig.selectedProfile.spec.identifiers
                              .map((identifier) => {
                                const defaultVal = formatResourceValue(
                                  identifier.defaultCount,
                                  identifier.resourceType,
                                ).toString();
                                const maxVal =
                                  identifier.maxCount === undefined
                                    ? 'unrestricted'
                                    : formatResourceValue(
                                        identifier.maxCount,
                                        identifier.resourceType,
                                      ).toString();
                                return formatResource(identifier.displayName, defaultVal, maxVal);
                              })
                              .join('; '))
                        }
                      />
                    </HelperTextItem>
                    {!getHardwareProfileDescription(hardwareProfileConfig.selectedProfile) &&
                      (() => {
                        const kueue = hardwareProfileConfig.selectedProfile.spec.scheduling?.kueue;
                        if (!kueue?.localQueueName) {
                          return null;
                        }
                        return (
                          <HelperTextItem>
                            {`Local queue: ${kueue.localQueueName}${
                              kueue.priorityClass ? `; Priority: ${kueue.priorityClass}` : ''
                            }`}
                          </HelperTextItem>
                        );
                      })()}
                  </HelperText>
                </FormHelperText>
              ) : hardwareProfileConfig.useExistingSettings ? (
                'Use existing resource requests/limits, tolerations, and node selectors.'
              ) : null}
              {kueueFilteringInfoHelper}
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
              {kueueFilteringInfoHelper}
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
              localQueueName={
                hardwareProfileConfig.selectedProfile?.spec.scheduling?.kueue?.localQueueName
              }
              priorityClass={
                hardwareProfileConfig.selectedProfile?.spec.scheduling?.kueue?.priorityClass
              }
              tolerations={
                hardwareProfileConfig.selectedProfile?.spec.scheduling?.node?.tolerations
              }
              nodeSelector={
                hardwareProfileConfig.selectedProfile?.spec.scheduling?.node?.nodeSelector
              }
            />
          )}
        </FlexItem>
      </Flex>
    </>
  );
};

export default HardwareProfileSelect;
