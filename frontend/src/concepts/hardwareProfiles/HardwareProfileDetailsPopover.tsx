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
import { Toleration, NodeSelector } from '#~/types';
import { HardwareProfileKind } from '#~/k8sTypes';
import {
  getClusterQueueNameFromLocalQueues,
  getHardwareProfileDescription,
  getHardwareProfileDisplayName,
} from '#~/pages/hardwareProfiles/utils.ts';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import {
  formatToleration,
  formatNodeSelector,
  formatIdentifierDetails,
  sortIdentifiers,
} from './utils';

type HardwareProfileDetailsPopoverProps = {
  localQueueName?: string;
  priorityClass?: string;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  hardwareProfile?: HardwareProfileKind;
  tableView?: boolean;
};

const HardwareProfileDetailsPopover: React.FC<HardwareProfileDetailsPopoverProps> = ({
  localQueueName,
  priorityClass,
  tolerations,
  nodeSelector,
  hardwareProfile,
  tableView = false,
}) => {
  const { localQueues } = React.useContext(ProjectDetailsContext);
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

  const profileIdentifiers = React.useMemo(
    () =>
      hardwareProfile?.spec.identifiers ? sortIdentifiers(hardwareProfile.spec.identifiers) : [],
    [hardwareProfile],
  );

  const description = hardwareProfile && getHardwareProfileDescription(hardwareProfile);

  return (
    <Popover
      hasAutoWidth
      headerContent={
        hardwareProfile
          ? `${getHardwareProfileDisplayName(hardwareProfile)} details`
          : 'Existing settings'
      }
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
                    {renderSection(identifier.displayName || identifier.identifier, [
                      formatIdentifierDetails(identifier),
                    ])}
                  </StackItem>
                ))}
            </>
          ) : (
            <StackItem>
              No matching hardware profile found, using existing settings. Default, min, and max
              values are not available.
            </StackItem>
          )}
          {localQueueName && (
            <StackItem>{renderSection('Local queue', [localQueueName])}</StackItem>
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
    >
      <Button
        isInline
        variant="link"
        icon={tableView ? undefined : <QuestionCircleIcon />}
        style={tableView ? { textDecoration: 'none' } : undefined}
        data-testid="hardware-profile-details-popover"
      >
        {tableView ? (
          hardwareProfile ? (
            getHardwareProfileDisplayName(hardwareProfile)
          ) : (
            <i>Custom</i>
          )
        ) : (
          'View details'
        )}
      </Button>
    </Popover>
  );
};

export default HardwareProfileDetailsPopover;
