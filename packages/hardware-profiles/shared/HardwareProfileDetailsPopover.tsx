import * as React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Popover,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import type { Toleration, NodeSelector, HardwareProfileKind } from '@odh-dashboard/k8s-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import {
  getClusterQueueNameFromLocalQueues,
  getHardwareProfileDescription,
  getHardwareProfileDisplayName,
} from '@odh-dashboard/internal/pages/hardwareProfiles/utils';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import {
  formatToleration,
  formatNodeSelector,
  formatIdentifierDetails,
  sortIdentifiers,
  getLocalQueueLabel,
} from './utils';
import DeviceRequestsSection from './dra/DeviceRequestsSection';
import { useResourceClaimTemplateLookup } from './dra/useResourceClaimTemplateLookup';

type HardwareProfileDetailsPopoverProps = {
  localQueueName?: string;
  priorityClass?: string;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  hardwareProfile?: HardwareProfileKind;
  /** Workload project namespace used to resolve the claim template; not the profile namespace. */
  namespace?: string;
  tableView?: boolean;
  onExpandRow?: () => void;
};

const HardwareProfileDetailsPopover: React.FC<HardwareProfileDetailsPopoverProps> = ({
  localQueueName,
  priorityClass,
  tolerations,
  nodeSelector,
  hardwareProfile,
  namespace,
  tableView = false,
  onExpandRow,
}) => {
  const { localQueues } = React.useContext(LocalQueuesContext);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const clusterQueueName = React.useMemo(
    () => getClusterQueueNameFromLocalQueues(localQueueName, localQueues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localQueueName, localQueues.data, localQueues.loaded],
  );

  const renderSection = (title: string, items: string[]) => (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTerm>{title}</DescriptionListTerm>
        <DescriptionListDescription>
          {items.map((item) => (
            <div key={item}>
              <Truncate content={item} />
            </div>
          ))}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );

  const templateName = hardwareProfile?.spec.dra?.resourceClaimTemplateName;
  // `enabled` gates the request on visibility so a closed popover never fetches.
  const templateLookup = useResourceClaimTemplateLookup({
    templateName,
    namespace,
    enabled: isPopoverVisible,
  });

  const profileIdentifiers = React.useMemo(
    () =>
      hardwareProfile?.spec.identifiers ? sortIdentifiers(hardwareProfile.spec.identifiers) : [],
    [hardwareProfile],
  );

  const description = hardwareProfile && getHardwareProfileDescription(hardwareProfile);

  const closePopover = (event: MouseEvent | KeyboardEvent) => {
    setIsPopoverVisible(false);
    if (event instanceof KeyboardEvent) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const noHpTableView = tableView && !hardwareProfile;

  const headerContent = hardwareProfile
    ? `${getHardwareProfileDisplayName(hardwareProfile)} details`
    : noHpTableView
    ? 'No hardware profile defined'
    : 'Existing settings';

  const triggerLabel =
    tableView && hardwareProfile
      ? getHardwareProfileDisplayName(hardwareProfile)
      : tableView
      ? 'No hardware profile'
      : 'View details';

  return (
    <Popover
      hasAutoWidth={!!hardwareProfile}
      // Auto width has no cap, so long template or class names must still stop at the viewport.
      maxWidth={hardwareProfile ? 'calc(100vw - var(--pf-t--global--spacer--2xl))' : undefined}
      isVisible={isPopoverVisible}
      shouldOpen={() => setIsPopoverVisible(true)}
      shouldClose={closePopover}
      withFocusTrap={false}
      headerContent={headerContent}
      bodyContent={
        <Stack hasGutter data-testid="hardware-profile-details">
          {hardwareProfile ? (
            <>
              {description && (
                <StackItem>
                  <Truncate content={description} />
                </StackItem>
              )}
              {profileIdentifiers.length > 0 &&
                profileIdentifiers.map((identifier) => (
                  <StackItem key={identifier.identifier}>
                    {renderSection(
                      identifier.displayName &&
                        identifier.displayName.toLowerCase() !== identifier.identifier.toLowerCase()
                        ? `${identifier.displayName} (${identifier.identifier})`
                        : identifier.displayName || identifier.identifier,
                      [formatIdentifierDetails(identifier)],
                    )}
                  </StackItem>
                ))}
              {templateName && (
                <StackItem>
                  <DeviceRequestsSection
                    templateName={templateName}
                    namespace={namespace}
                    lookup={templateLookup}
                  />
                </StackItem>
              )}
            </>
          ) : noHpTableView ? (
            <StackItem>
              No hardware profile is defined for this workbench. It&apos;s using its current
              resource settings, so default, minimum, and maximum values aren&apos;t available.
            </StackItem>
          ) : !localQueueName ? (
            <StackItem>
              No matching hardware profile found, using existing settings. Default, min, and max
              values are not available.
            </StackItem>
          ) : null}
          {localQueueName && (
            <StackItem>{renderSection(getLocalQueueLabel(), [localQueueName])}</StackItem>
          )}
          {clusterQueueName && (
            <StackItem>{renderSection('Cluster queue', [clusterQueueName])}</StackItem>
          )}
          {priorityClass && (
            <StackItem>{renderSection('Workload priority', [priorityClass])}</StackItem>
          )}
          {tolerations && tolerations.length > 0 && (
            <StackItem>
              {renderSection(
                'Tolerations',
                tolerations.map((toleration) => formatToleration(toleration)),
              )}
            </StackItem>
          )}
          {nodeSelector && Object.keys(nodeSelector).length > 0 && (
            <StackItem>
              {renderSection('Node selectors', formatNodeSelector(nodeSelector))}
            </StackItem>
          )}
        </Stack>
      }
      footerContent={
        noHpTableView && onExpandRow ? (
          <Button
            variant="link"
            isInline
            onClick={() => {
              onExpandRow();
              setIsPopoverVisible(false);
            }}
          >
            Expand row
          </Button>
        ) : undefined
      }
    >
      <Button
        ref={triggerRef}
        isInline
        variant="link"
        icon={tableView ? undefined : <QuestionCircleIcon />}
        style={tableView ? { textDecoration: 'none' } : undefined}
        data-testid="hardware-profile-details-popover"
      >
        {triggerLabel}
      </Button>
    </Popover>
  );
};

export default HardwareProfileDetailsPopover;
