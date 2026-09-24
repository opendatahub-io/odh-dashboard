import React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import FormGroupLabel from '~/app/components/FormGroupLabel';
import type { HardwareProfile, KueueAvailability } from '~/app/types';

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

const hardwareProfileHelp = {
  ariaLabel: 'More info for hardware profile',
  content:
    'A hardware profile defines the resources requested by the evaluation and the Kueue LocalQueue used to schedule it. Kueue may wait to start the evaluation until the requested capacity is available.',
};

const formatResourceDetails = (
  resource: NonNullable<HardwareProfile['resources']>[number],
): string => {
  const values = [
    resource.default ? `Default = ${resource.default}` : undefined,
    resource.minimum ? `Minimum = ${resource.minimum}` : undefined,
    resource.maximum ? `Maximum = ${resource.maximum}` : undefined,
  ].filter((value): value is string => value !== undefined);

  return `${resource.display_name ?? resource.identifier}: ${values.join(', ')}`;
};

const formatDetails = (profile: HardwareProfile): string =>
  (profile.resources ?? [])
    .filter((resource) => resource.default || resource.minimum || resource.maximum)
    .map(formatResourceDetails)
    .concat(profile.local_queue_name ? `LocalQueue: ${profile.local_queue_name}` : [])
    .join('; ');

type HardwareProfileFieldState = {
  unavailable: boolean;
  placeholder: string;
  helperText: string;
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
        helperText: `${error?.message ?? 'Unable to load hardware profiles.'} Resolve this error before starting an evaluation.`,
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
        helperText: isRequired
          ? 'Select a hardware profile to schedule this evaluation through Kueue.'
          : 'Only queue-backed hardware profiles are shown.',
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
  const selected = profiles.find((profile) => profile.name === selectedProfile);
  const formGroupClassName = `evalhub-form-group--with-description${className ? ` ${className}` : ''}`;
  const hasNoQueues = availability?.enabled === true && !availability.scheduling_ready;
  const hasNoProfiles = availability?.scheduling_ready === true && profiles.length === 0;
  const fieldState = getHardwareProfileFieldState({
    error,
    hasNoQueues,
    hasNoProfiles,
    isRequired,
  });
  const profileSelectionDisabled = disabled || fieldState.unavailable;
  const description = isRequired
    ? 'Select the compute resources and Kueue LocalQueue for this evaluation.'
    : 'Optional. Select the compute resources and Kueue LocalQueue for this evaluation.';

  if (!loaded) {
    return (
      <FormGroup
        className={formGroupClassName}
        label={
          <FormGroupLabel
            label="Hardware profile"
            description={description}
            helpPopover={hardwareProfileHelp}
          />
        }
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
      className={formGroupClassName}
      label={
        <FormGroupLabel
          label="Hardware profile"
          description={description}
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
              : profiles.find((profile) => profile.name === selectedValue),
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
          {profiles.map((profile) => (
            <SelectOption
              key={profile.name}
              value={profile.name}
              description={formatDetails(profile)}
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
        <HelperText data-testid="hardware-profile-helper-text">
          {selected ? (
            <HelperTextItem data-testid="hardware-profile-details">
              {formatDetails(selected)}
            </HelperTextItem>
          ) : null}
          {!selected || fieldState.helperVariant ? (
            <HelperTextItem variant={fieldState.helperVariant}>
              {fieldState.helperText}
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
    </FormGroup>
  );
};

export default HardwareProfileField;
