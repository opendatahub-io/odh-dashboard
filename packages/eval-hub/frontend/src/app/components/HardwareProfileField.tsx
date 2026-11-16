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
import type { HardwareProfileInfo, KueueAvailability } from '~/app/types';
import { parseEmbeddedErrorMessage } from '~/app/utilities/errorMessageUtils';
import {
  formatHardwareProfileDetails,
  formatHardwareProfileResourceDetails,
} from '~/app/utilities/hardwareProfileUtils';
import './HardwareProfileField.scss';

type HardwareProfileFieldProps = {
  availability?: KueueAvailability;
  profiles: HardwareProfileInfo[];
  loaded: boolean;
  error?: Error;
  compatibilityError?: Error;
  selectedProfile?: string;
  onSelect: (profile: HardwareProfileInfo | undefined) => void;
  disabled?: boolean;
  className?: string;
};

// Sentinel scoped to this component: PF Select needs a concrete string value for
// the no-profile option, but it never enters form state or the request — the
// handler maps it to onSelect(undefined), which submits without hardware_config.
const NO_HARDWARE_PROFILE_VALUE = '__no_hardware_profile__';
const NO_HARDWARE_PROFILE_LABEL = 'Default (no hardware profile)';

const KUEUE_PROFILE_FILTER_INFO =
  'Only hardware profiles configured with a local queue are shown because this project uses Kueue for workload scheduling.';

const hardwareProfileHelp = {
  ariaLabel: 'More info for hardware profile',
  content:
    'Selecting a hardware profile allows you to match the hardware requirements of your workload to available node resources. Leave the default to schedule through Kubernetes without a Kueue queue.',
};

const renderDetailsSection = (title: string, value: string) => (
  <DescriptionList>
    <DescriptionListGroup>
      <DescriptionListTerm>{title}</DescriptionListTerm>
      <DescriptionListDescription>{value}</DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);

const HardwareProfileDetailsPopover: React.FC<{ profile: HardwareProfileInfo }> = ({ profile }) => {
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
      headerContent={`${profile.display_name ?? profile.name} details`}
      bodyContent={
        <Stack hasGutter data-testid="hardware-profile-details-popover-content">
          {profile.description ? <StackItem>{profile.description}</StackItem> : null}
          {profile.identifiers.map((resource) => (
            <StackItem key={resource.identifier}>
              {renderDetailsSection(
                resource.display_name ?? resource.identifier,
                formatHardwareProfileResourceDetails(resource),
              )}
            </StackItem>
          ))}
          {profile.queue_name ? (
            <StackItem>
              {renderDetailsSection(
                'Local queue',
                profile.queue_availability && profile.queue_availability.status !== 'active'
                  ? `${profile.queue_name} — ${
                      profile.queue_availability.message ??
                      profile.queue_availability.reason ??
                      'queue is not active'
                    }`
                  : profile.queue_name,
              )}
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

const getHardwareProfileFieldState = ({ error }: { error?: Error }): HardwareProfileFieldState => {
  if (error) {
    return {
      unavailable: true,
      placeholder: 'Hardware profiles unavailable',
      helperText: `${parseEmbeddedErrorMessage(
        error.message,
      )} You can still start the evaluation without a hardware profile.`,
      helperVariant: 'error',
    };
  }
  return {
    unavailable: false,
    placeholder: NO_HARDWARE_PROFILE_LABEL,
    helperText: 'Runs on the default cluster resources without Kueue queue scheduling.',
  };
};

const HardwareProfileField: React.FC<HardwareProfileFieldProps> = ({
  availability,
  profiles,
  loaded,
  error,
  compatibilityError,
  selectedProfile,
  onSelect,
  disabled,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  // The service only returns queue-backed profiles while their LocalQueue exists in
  // the tenant namespace, so the list needs no further filtering here.
  const schedulableProfiles = profiles;
  const selected = schedulableProfiles.find((profile) => profile.name === selectedProfile);
  // The field is optional: an empty list or a failed load never blocks submission —
  // the unselected state is the "Default (no hardware profile)" option, which submits
  // without hardware_config and runs on the regular K8s path.
  const fieldState = getHardwareProfileFieldState({ error });
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

  if (!error && !availability?.enabled) {
    return null;
  }

  return (
    <FormGroup
      className={className}
      label={<FormGroupLabel label="Hardware profile" helpPopover={hardwareProfileHelp} />}
      fieldId="hardware-profile"
    >
      <Select
        id="hardware-profile-select"
        data-testid="hardware-profile-select"
        isOpen={isOpen && !profileSelectionDisabled}
        selected={selectedProfile}
        onSelect={(_event, value) => {
          onSelect(schedulableProfiles.find((profile) => profile.name === String(value)));
          setIsOpen(false);
        }}
        onOpenChange={setIsOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            id="hardware-profile"
            ref={toggleRef}
            isFullWidth
            isExpanded={isOpen}
            isDisabled={profileSelectionDisabled}
            onClick={() => setIsOpen((open) => !open)}
            data-testid="hardware-profile-toggle"
          >
            {selected ? (selected.display_name ?? selected.name) : fieldState.placeholder}
          </MenuToggle>
        )}
      >
        <SelectList>
          <SelectOption
            value={NO_HARDWARE_PROFILE_VALUE}
            description="Starts the evaluation without a hardware profile, scheduled by Kubernetes outside the Kueue queue."
            isSelected={!selected}
            data-testid="hardware-profile-option-default"
          >
            {NO_HARDWARE_PROFILE_LABEL}
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
                <SplitItem isFilled>{profile.display_name ?? profile.name}</SplitItem>
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
