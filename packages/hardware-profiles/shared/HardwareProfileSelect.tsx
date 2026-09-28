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
import { ExclamationTriangleIcon, InfoCircleIcon } from '@patternfly/react-icons';
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
  prioritizeHardwareProfiles,
} from '@odh-dashboard/internal/pages/hardwareProfiles/utils';
import { CurrentProjectContext } from '@odh-dashboard/ui-core/context/CurrentProjectContext';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useApplicationSettings } from '@odh-dashboard/internal/app/useApplicationSettings';
import {
  computeLocalQueueNamesResult,
  filterProfilesByKueue,
  KueueFilteringState,
  useKueueConfiguration,
} from './kueueUtils';
import {
  formatResource,
  formatResourceValue,
  getClaimTemplateMissingText as getProfileClaimTemplateMissingText,
  isDRAHardwareProfile,
  isSameHardwareProfileBinding,
} from './utils';
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import {
  type ResourceClaimTemplateNamesResult,
  useResourceClaimTemplateNames,
} from './useResourceClaimTemplateNames';
import { useIsDRAHardwareProfileEnabled } from './useIsDRAHardwareProfileEnabled';
import HardwareProfileDetailsPopover from './HardwareProfileDetailsPopover';

const getIdentifiersText = (
  identifiers: HardwareProfileKind['spec']['identifiers'],
): string | undefined => {
  if (!identifiers?.length) {
    return undefined;
  }
  return identifiers
    .map((identifier) => {
      const defaultVal = formatResourceValue(
        identifier.defaultCount,
        identifier.resourceType,
      ).toString();
      const maxVal =
        identifier.maxCount === undefined
          ? 'unrestricted'
          : formatResourceValue(identifier.maxCount, identifier.resourceType).toString();
      return formatResource(identifier.displayName, defaultVal, maxVal);
    })
    .join('; ');
};

const getKueueText = (profile: HardwareProfileKind): string | undefined => {
  const localQueueName = profile.spec.scheduling?.kueue?.localQueueName;
  if (!localQueueName) {
    return undefined;
  }
  const priorityClass = profile.spec.scheduling?.kueue?.priorityClass;
  return `Local queue: ${localQueueName}${priorityClass ? `; Priority: ${priorityClass}` : ''}`;
};

const getClaimTemplateText = (
  profile: HardwareProfileKind,
  isDRAEnabled: boolean,
): string | undefined => {
  const resourceClaimTemplateName = profile.spec.dra?.resourceClaimTemplateName;
  return isDRAEnabled && resourceClaimTemplateName
    ? `Claim template: ${resourceClaimTemplateName}`
    : undefined;
};

const hiddenTruncateTooltipProps = { trigger: 'manual', isVisible: false } as const;

const claimTemplateMissingIcon = (
  <Icon
    status="warning"
    isInline
    className="pf-v6-u-ml-sm"
    data-testid="claim-template-missing-icon"
  >
    <ExclamationTriangleIcon />
  </Icon>
);

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
  isHardwareProfilePreferred?: (profile: HardwareProfileKind) => boolean;
  onChange: (profile: HardwareProfileKind | undefined) => void;
  project?: string;
  selectionIndicator?: React.ReactNode;
  excludeDRAProfiles?: boolean;
  claimTemplateNames?: ResourceClaimTemplateNamesResult;
};

const EXISTING_SETTINGS_KEY = '.existing';
const TOOLTIP_MAX_LINES = 30;

const getProfileOptionKey = (profile: HardwareProfileKind): string =>
  `${profile.metadata.namespace}/${profile.metadata.name}`;

const HardwareProfileSelect: React.FC<HardwareProfileSelectProps> = ({
  initialHardwareProfile,
  previewDescription = false,
  hardwareProfiles,
  isProjectScoped,
  hardwareProfilesLoaded,
  hardwareProfilesError,
  projectScopedHardwareProfiles,
  selectionIndicator,
  allowExistingSettings = false,
  hardwareProfileConfig,
  isHardwareProfileSupported,
  isHardwareProfilePreferred,
  onChange,
  project,
  excludeDRAProfiles = false,
  claimTemplateNames: sharedClaimTemplateNames,
}) => {
  const [searchHardwareProfile, setSearchHardwareProfile] = React.useState('');
  const [
    currentProjectHardwareProfiles,
    currentProjectHardwareProfilesLoaded,
    currentProjectHardwareProfilesError,
  ] = projectScopedHardwareProfiles;

  const { currentProject } = React.useContext(CurrentProjectContext);
  const { localQueues } = React.useContext(LocalQueuesContext);
  const { projects } = React.useContext(ProjectsContext);
  const { dashboardConfig } = useApplicationSettings();
  const isDRAEnabled = useIsDRAHardwareProfileEnabled();
  const hardwareProfileOrder = React.useMemo(
    () => dashboardConfig?.spec.hardwareProfileOrder || [],
    [dashboardConfig?.spec.hardwareProfileOrder],
  );

  const orderProfiles = React.useCallback(
    (profiles: HardwareProfileKind[]) => {
      if (isHardwareProfilePreferred) {
        return prioritizeHardwareProfiles(
          profiles,
          isHardwareProfilePreferred,
          hardwareProfileOrder,
        );
      }
      return orderHardwareProfiles(profiles, hardwareProfileOrder);
    },
    [hardwareProfileOrder, isHardwareProfilePreferred],
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

  const isInitialProfile = React.useCallback(
    (profile: HardwareProfileKind): boolean =>
      !!initialHardwareProfile &&
      isSameHardwareProfileBinding(profile.metadata, initialHardwareProfile.metadata),
    [initialHardwareProfile],
  );

  const keepInitialProfileInOptions =
    !!initialHardwareProfile &&
    (!excludeDRAProfiles ||
      !isDRAHardwareProfile(initialHardwareProfile) ||
      (!!hardwareProfileConfig.selectedProfile &&
        isInitialProfile(hardwareProfileConfig.selectedProfile)));

  const hasDRAProfile =
    isDRAEnabled &&
    (hardwareProfiles.some(isDRAHardwareProfile) ||
      currentProjectHardwareProfiles.some(isDRAHardwareProfile) ||
      (!!initialHardwareProfile && isDRAHardwareProfile(initialHardwareProfile)));
  const ownClaimTemplateNames = useResourceClaimTemplateNames(
    hasDRAProfile && !sharedClaimTemplateNames ? project : undefined,
  );
  const claimTemplateNames = sharedClaimTemplateNames ?? ownClaimTemplateNames;

  const getClaimTemplateMissingText = React.useCallback(
    (profile: HardwareProfileKind): string | undefined =>
      isDRAEnabled ? getProfileClaimTemplateMissingText(profile, claimTemplateNames) : undefined,
    [claimTemplateNames, isDRAEnabled],
  );

  const options = React.useMemo(() => {
    const enabledProfiles = orderProfiles(
      filterProfilesByKueue(
        hardwareProfiles.filter(isHardwareProfileEnabled),
        kueueFilteringState,
        availableLocalQueueNames,
      ),
    );

    if (
      initialHardwareProfile &&
      keepInitialProfileInOptions &&
      !enabledProfiles.some(isInitialProfile)
    ) {
      enabledProfiles.push(initialHardwareProfile);
    }

    const formattedOptions: SimpleSelectOption[] = enabledProfiles.map((profile) => {
      const displayName = `${getHardwareProfileDisplayName(profile)}${
        !isHardwareProfileEnabled(profile) ? ' (disabled)' : ''
      }`;
      const description = getHardwareProfileDescription(profile);
      const identifiersText = getIdentifiersText(profile.spec.identifiers);
      const kueueText = getKueueText(profile);
      const claimTemplateText = getClaimTemplateText(profile, isDRAEnabled);
      const queueMissing = isInitialProfile(profile) && isQueueMissing(profile);
      const claimTemplateMissingText = getClaimTemplateMissingText(profile);
      const isClaimTemplateUnavailable = !!claimTemplateMissingText && !isInitialProfile(profile);
      const truncateTooltipProps = claimTemplateMissingText
        ? hiddenTruncateTooltipProps
        : undefined;

      return {
        key: getProfileOptionKey(profile),
        dataTestId: profile.metadata.name,
        label: displayName,
        ...(claimTemplateMissingText && {
          isAriaDisabled: isClaimTemplateUnavailable,
          tooltipProps: { content: claimTemplateMissingText },
        }),
        description: (
          <Stack>
            {description && (
              <StackItem>
                {claimTemplateMissingText ? (
                  <Truncate content={description} tooltipProps={truncateTooltipProps} />
                ) : (
                  <TruncatedText
                    maxLines={1}
                    tooltipMaxLines={TOOLTIP_MAX_LINES}
                    content={description}
                  />
                )}
              </StackItem>
            )}
            {identifiersText && (
              <StackItem>
                <Truncate content={identifiersText} tooltipProps={truncateTooltipProps} />
              </StackItem>
            )}
            {kueueText && (
              <StackItem>
                <Truncate content={kueueText} tooltipProps={truncateTooltipProps} />
              </StackItem>
            )}
            {claimTemplateText && (
              <StackItem>
                <Truncate content={claimTemplateText} tooltipProps={truncateTooltipProps} />
              </StackItem>
            )}
          </Stack>
        ),
        dropdownLabel: (
          <Split>
            <SplitItem>
              {displayName}
              {claimTemplateMissingText && claimTemplateMissingIcon}
            </SplitItem>
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
    keepInitialProfileInOptions,
    isInitialProfile,
    allowExistingSettings,
    isHardwareProfileSupported,
    isQueueMissing,
    getClaimTemplateMissingText,
    availableLocalQueueNames,
    kueueFilteringState,
    orderProfiles,
    isDRAEnabled,
  ]);

  const renderMenuItem = (
    profile: HardwareProfileKind,
    index: number,
    scope: 'project' | 'global',
  ) => {
    const description = getHardwareProfileDescription(profile);
    const identifiersText = getIdentifiersText(profile.spec.identifiers);
    const kueueText = getKueueText(profile);
    const claimTemplateText = getClaimTemplateText(profile, isDRAEnabled);
    const queueMissing = isInitialProfile(profile) && isQueueMissing(profile);
    const claimTemplateMissingText = getClaimTemplateMissingText(profile);
    const isClaimTemplateUnavailable = !!claimTemplateMissingText && !isInitialProfile(profile);
    const truncateTooltipProps = claimTemplateMissingText ? hiddenTruncateTooltipProps : undefined;
    return (
      <MenuItem
        key={`${index}-${scope}-hardware-profile-${profile.metadata.name}`}
        isSelected={
          !!hardwareProfileConfig.selectedProfile &&
          isSameHardwareProfileBinding(
            profile.metadata,
            hardwareProfileConfig.selectedProfile.metadata,
          )
        }
        isAriaDisabled={isClaimTemplateUnavailable}
        tooltipProps={claimTemplateMissingText ? { content: claimTemplateMissingText } : undefined}
        onClick={() => onChange(profile)}
        icon={<ProjectScopedIcon isProject={scope === 'project'} alt="" />}
        description={
          <Stack style={{ marginLeft: '19px' }}>
            {description && (
              <StackItem>
                <Truncate content={description} tooltipProps={truncateTooltipProps} />
              </StackItem>
            )}
            {identifiersText && (
              <StackItem>
                <Truncate content={identifiersText} tooltipProps={truncateTooltipProps} />
              </StackItem>
            )}
            {kueueText && (
              <StackItem>
                <Truncate content={kueueText} tooltipProps={truncateTooltipProps} />
              </StackItem>
            )}
            {claimTemplateText && (
              <StackItem>
                <Truncate content={claimTemplateText} tooltipProps={truncateTooltipProps} />
              </StackItem>
            )}
          </Stack>
        }
      >
        <Split>
          <SplitItem>
            {getHardwareProfileDisplayName(profile)}
            {claimTemplateMissingText && claimTemplateMissingIcon}
          </SplitItem>
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

  const processHardwareProfilesForSelection = (
    profiles: HardwareProfileKind[],
    isProjectGroup: boolean,
  ) => {
    const filteredProfiles = filterProfilesByKueue(
      profiles.filter(isHardwareProfileEnabled),
      kueueFilteringState,
      availableLocalQueueNames,
    );
    // Rescue only in the group the profile belongs to, to avoid showing it in both sections. The
    // namespace decides the group, as a profile hidden from selection is in neither list.
    const initialBelongsToGroup = initialHardwareProfile
      ? (initialHardwareProfile.metadata.namespace === project) === isProjectGroup
      : false;
    if (
      initialHardwareProfile &&
      initialBelongsToGroup &&
      keepInitialProfileInOptions &&
      !filteredProfiles.some(isInitialProfile)
    ) {
      filteredProfiles.push(initialHardwareProfile);
    }
    return orderProfiles(filteredProfiles).filter((profile) =>
      getHardwareProfileDisplayName(profile)
        .toLocaleLowerCase()
        .includes(searchHardwareProfile.toLocaleLowerCase()),
    );
  };

  const projectHardwareProfiles = processHardwareProfilesForSelection(
    currentProjectHardwareProfiles,
    true,
  );

  const globalHardwareProfiles = processHardwareProfilesForSelection(hardwareProfiles, false);

  const profilesByOptionKey = React.useMemo(() => {
    const profilesByKey = new Map<string, HardwareProfileKind>();
    [...hardwareProfiles, ...(initialHardwareProfile ? [initialHardwareProfile] : [])].forEach(
      (profile) => {
        const key = getProfileOptionKey(profile);
        if (!profilesByKey.has(key)) {
          profilesByKey.set(key, profile);
        }
      },
    );
    return profilesByKey;
  }, [hardwareProfiles, initialHardwareProfile]);
  const findProfileByOptionKey = (key: string) => profilesByOptionKey.get(key);

  const onlyOptionProfile =
    options.length === 1 ? findProfileByOptionKey(options[0].key) : undefined;
  const autoSelectOnlyOption = !onlyOptionProfile || !isDRAHardwareProfile(onlyOptionProfile);

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
            This project uses the local queue workload allocation strategy. Only hardware profiles
            with a local queue are available in the dropdown.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    ) : null;

  return (
    <>
      <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem grow={{ default: 'grow' }}>
          {isProjectScoped &&
          (currentProjectHardwareProfiles.length > 0 ||
            (!!project &&
              (hardwareProfileConfig.selectedProfile?.metadata.namespace === project ||
                initialHardwareProfile?.metadata.namespace === project))) ? (
            <>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
                flexWrap={{ default: 'nowrap' }}
              >
                <FlexItem grow={{ default: 'grow' }}>
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
                          allowExistingSettings
                            ? 'Use existing settings'
                            : 'Select hardware profile...'
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
                </FlexItem>
                {selectionIndicator && <FlexItem>{selectionIndicator}</FlexItem>}
              </Flex>
              {(() => {
                if (!previewDescription || !hardwareProfileConfig.selectedProfile) {
                  return hardwareProfileConfig.useExistingSettings ? (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>
                          Use existing resource requests/limits, tolerations, and node selectors.
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  ) : null;
                }

                const description = getHardwareProfileDescription(
                  hardwareProfileConfig.selectedProfile,
                );
                const identifiersText = getIdentifiersText(
                  hardwareProfileConfig.selectedProfile.spec.identifiers,
                );
                const kueueText = getKueueText(hardwareProfileConfig.selectedProfile);
                const claimTemplateText = getClaimTemplateText(
                  hardwareProfileConfig.selectedProfile,
                  isDRAEnabled,
                );

                // No preview content.
                if (!description && !identifiersText && !kueueText && !claimTemplateText) {
                  return null;
                }

                return (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        {description && (
                          <TruncatedText
                            maxLines={1}
                            tooltipMaxLines={TOOLTIP_MAX_LINES}
                            content={description}
                          />
                        )}
                        {identifiersText && <Truncate content={identifiersText} />}
                        {identifiersText && kueueText && <br />}
                        {kueueText && <Truncate content={kueueText} />}
                        {(identifiersText || kueueText) && claimTemplateText && <br />}
                        {claimTemplateText && <Truncate content={claimTemplateText} />}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                );
              })()}
              {kueueFilteringInfoHelper}
              {(hardwareProfilesError || currentProjectHardwareProfilesError) && (
                <HelperText isLiveRegion>
                  <HelperTextItem variant="error">Error loading hardware profiles</HelperTextItem>
                </HelperText>
              )}
            </>
          ) : (
            <>
              <Flex
                alignItems={{ default: 'alignItemsFlexStart' }}
                spaceItems={{ default: 'spaceItemsSm' }}
                flexWrap={{ default: 'nowrap' }}
              >
                <FlexItem grow={{ default: 'grow' }}>
                  <SimpleSelect
                    dataTestId="hardware-profile-select"
                    previewDescription={previewDescription}
                    options={options}
                    value={
                      hardwareProfileConfig.selectedProfile
                        ? getProfileOptionKey(hardwareProfileConfig.selectedProfile)
                        : hardwareProfileConfig.useExistingSettings
                        ? EXISTING_SETTINGS_KEY
                        : undefined
                    }
                    onChange={(key) => {
                      if (key === EXISTING_SETTINGS_KEY) {
                        onChange(undefined);
                      } else {
                        const profile = findProfileByOptionKey(key);
                        if (profile) {
                          onChange(profile);
                        }
                      }
                    }}
                    autoSelectOnlyOption={autoSelectOnlyOption}
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
                </FlexItem>
                {selectionIndicator && <FlexItem>{selectionIndicator}</FlexItem>}
              </Flex>
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
