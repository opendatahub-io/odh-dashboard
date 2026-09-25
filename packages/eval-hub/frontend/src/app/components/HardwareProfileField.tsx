import React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  Label,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  Stack,
  StackItem,
  Split,
  SplitItem,
  Popover,
} from '@patternfly/react-core';
import { InfoCircleIcon, QuestionCircleIcon } from '@patternfly/react-icons';
import FormGroupLabel from '~/app/components/FormGroupLabel';
import type { HardwareProfile, KueueAvailability } from '~/app/types';
import {
  formatHardwareProfileDetails,
  formatHardwareProfileResourceDetails,
} from '~/app/utilities/hardwareProfileUtils';
import './HardwareProfileField.scss';

type HardwareProfileFieldProps = {
  availability?: KueueAvailability;
  profiles: HardwareProfile[];
  loaded: boolean;
  error?: Error;
  compatibilityError?: Error;
  selectedProfile?: string;
  onSelect: (profile: HardwareProfile | undefined) => void;
  isRequired?: boolean;
  disabled?: boolean;
  className?: string;
};

const NO_HARDWARE_PROFILE_VALUE = '__no_hardware_profile__';
const KUEUE_PROFILE_FILTER_INFO =
  'Only hardware profiles configured with a local queue are shown because this project uses Kueue for workload scheduling.';

const hardwareProfileHelp = {
  ariaLabel: 'More info for hardware profile',
  content:
    'Selecting a hardware profile allows you to match the hardware requirements of your workload to available node resources.',
};

const renderDetailsSection = (title: string, value: string) => (
  <DescriptionList>
    <DescriptionListGroup>
      <DescriptionListTerm>{title}</DescriptionListTerm>
      <DescriptionListDescription>{value}</DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);

const HardwareProfileDetailsPopover: React.FC<{ profile: HardwareProfile }> = ({ profile }) => {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  const closePopover = (event: MouseEvent | KeyboardEvent) => {
    setIsVisible(false);
    if (event instanceof KeyboardEvent) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  return (
    <Popover
      hasAutoWidth
      isVisible={isVisible}
      shouldOpen={() => setIsVisible(true)}
      shouldClose={closePopover}
      withFocusTrap={false}
      headerContent={`${profile.display_name} details`}
      bodyContent={
        <Stack hasGutter data-testid="hardware-profile-details-popover-content">
          {profile.description ? <StackItem>{profile.description}</StackItem> : null}
          {(profile.resources ?? []).map((resource) => (
            <StackItem key={resource.identifier}>
              {renderDetailsSection(
                resource.display_name ?? resource.identifier,
                formatHardwareProfileResourceDetails(resource),
              )}
            </StackItem>
          ))}
          {profile.local_queue_name ? (
            <StackItem>{renderDetailsSection('Local queue', profile.local_queue_name)}</StackItem>
          ) : null}
          {profile.cluster_queue_name ? (
            <StackItem>
              {renderDetailsSection('Cluster queue', profile.cluster_queue_name)}
            </StackItem>
          ) : null}
        </Stack>
      }
    >
      <Button
        ref={triggerRef}
        variant="link"
        isInline
        icon={<QuestionCircleIcon />}
        className="pf-v6-u-mt-sm"
        data-testid="hardware-profile-details-popover"
      >
        View details
      </Button>
    </Popover>
  );
};

type HardwareProfileFieldState = {
  unavailable: boolean;
  placeholder: string;
  helperText?: string;
  helperVariant?: 'warning' | 'error';
};

const getHardwareProfileFieldState = ({
  error,
  hasNoQueues,
  hasNoProfiles,
  isRequired,
}: {
  error?: Error;
  hasNoQueues: boolean;
  hasNoProfiles: boolean;
  isRequired: boolean;
}): HardwareProfileFieldState => {
  switch (true) {
    case Boolean(error):
      return {
        unavailable: true,
        placeholder: 'Hardware profiles unavailable',
        helperText: `${
          error?.message ?? 'Unable to load hardware profiles.'
        } Resolve this error before starting an evaluation.`,
        helperVariant: 'error',
      };
    case Boolean(hasNoQueues):
      return {
        unavailable: true,
        placeholder: 'No LocalQueues available',
        helperText:
          'No LocalQueues are configured for this project. An evaluation cannot start until an administrator configures one.',
        helperVariant: 'warning',
      };
    case hasNoProfiles:
      return {
        unavailable: true,
        placeholder: 'No compatible hardware profiles available',
        helperText:
          'No compatible hardware profiles are configured for this project. An evaluation cannot start until an administrator configures one.',
        helperVariant: 'warning',
      };
    default:
      return {
        unavailable: false,
        placeholder: 'Select hardware profile',
        helperText: isRequired ? undefined : 'Only queue-backed hardware profiles are shown.',
      };
  }
};

const HardwareProfileField: React.FC<HardwareProfileFieldProps> = ({
  availability,
  profiles,
  loaded,
  error,
  compatibilityError,
  selectedProfile,
  onSelect,
  isRequired = false,
  disabled,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const schedulableProfiles = availability?.enabled
    ? profiles.filter(
        (profile) =>
          !!profile.local_queue_name &&
          availability.local_queue_names.includes(profile.local_queue_name),
      )
    : profiles;
  const selected = schedulableProfiles.find((profile) => profile.name === selectedProfile);
  const hasNoQueues = availability?.enabled === true && !availability.scheduling_ready;
  const hasNoProfiles = availability?.scheduling_ready === true && schedulableProfiles.length === 0;
  const fieldState = getHardwareProfileFieldState({
    error,
    hasNoQueues,
    hasNoProfiles,
    isRequired,
  });
  const profileSelectionDisabled = disabled || fieldState.unavailable;
  if (!loaded) {
    return (
      <FormGroup
        className={className}
        label={<FormGroupLabel label="Hardware profile" helpPopover={hardwareProfileHelp} />}
        fieldId="hardware-profile"
      >
        <Skeleton
          data-testid="hardware-profile-skeleton"
          width="100%"
          height="40px"
          screenreaderText="Loading hardware profiles"
        />
      </FormGroup>
    );
  }

  if (!error && !availability?.enabled && !hasNoQueues) {
    return null;
  }

  return (
    <FormGroup
      className={className}
      label={
        <FormGroupLabel
          label="Hardware profile"
          isRequired={isRequired}
          helpPopover={hardwareProfileHelp}
        />
      }
      fieldId="hardware-profile"
    >
      <Select
        id="hardware-profile-select"
        data-testid="hardware-profile-select"
        isOpen={isOpen && !profileSelectionDisabled}
        selected={selectedProfile ?? NO_HARDWARE_PROFILE_VALUE}
        onSelect={(_event, value) => {
          const selectedValue = String(value);
          onSelect(
            selectedValue === NO_HARDWARE_PROFILE_VALUE
              ? undefined
              : schedulableProfiles.find((profile) => profile.name === selectedValue),
          );
          setIsOpen(false);
        }}
        onOpenChange={setIsOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            isFullWidth
            isExpanded={isOpen}
            isDisabled={profileSelectionDisabled}
            onClick={() => setIsOpen((open) => !open)}
            data-testid="hardware-profile-toggle"
          >
            {selected?.display_name ?? fieldState.placeholder}
          </MenuToggle>
        )}
      >
        <SelectList>
          <SelectOption
            value={NO_HARDWARE_PROFILE_VALUE}
            isSelected={!selectedProfile}
            data-testid="hardware-profile-no-selection-option"
          >
            No hardware profile
          </SelectOption>
          {schedulableProfiles.map((profile) => (
            <SelectOption
              key={profile.name}
              value={profile.name}
              description={formatHardwareProfileDetails(profile)}
              isSelected={profile.name === selectedProfile}
              data-testid={`hardware-profile-option-${profile.name}`}
            >
              <Split hasGutter className="pf-v6-u-w-100">
                <SplitItem isFilled>{profile.display_name}</SplitItem>
                {profile.compatibility?.compatible === false ? (
                  <SplitItem>
                    <Label
                      color="orange"
                      isCompact
                      data-testid={`hardware-profile-insufficient-${profile.name}`}
                    >
                      Insufficient resources
                    </Label>
                  </SplitItem>
                ) : null}
              </Split>
            </SelectOption>
          ))}
        </SelectList>
      </Select>
      <FormHelperText>
        <HelperText
          className="evalhub-hardware-profile-helper"
          data-testid="hardware-profile-helper-text"
        >
          {selected ? (
            <HelperTextItem data-testid="hardware-profile-details">
              {formatHardwareProfileDetails(selected)}
            </HelperTextItem>
          ) : null}
          {(!selected || fieldState.helperVariant) && fieldState.helperText ? (
            <HelperTextItem variant={fieldState.helperVariant}>
              {fieldState.helperText}
            </HelperTextItem>
          ) : null}
          {availability?.enabled ? (
            <HelperTextItem
              icon={
                <Icon status="info">
                  <InfoCircleIcon />
                </Icon>
              }
              data-testid="hardware-profile-kueue-info"
            >
              {KUEUE_PROFILE_FILTER_INFO}
            </HelperTextItem>
          ) : null}
          {compatibilityError ? (
            <HelperTextItem variant="warning">
              Resource recommendations could not be checked. You can still select a hardware profile
              and start the evaluation.
            </HelperTextItem>
          ) : null}
        </HelperText>
      </FormHelperText>
      {selected ? <HardwareProfileDetailsPopover profile={selected} /> : null}
    </FormGroup>
  );
};

export default HardwareProfileField;
