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
import { Toleration, NodeSelector, ContainerResources } from '#~/types';
import { HardwareProfileKind } from '#~/k8sTypes';
import { formatToleration, formatNodeSelector, formatResource, formatResourceValue } from './utils';

type HardwareProfileDetailsPopoverProps = {
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  resources?: ContainerResources;
  hardwareProfile?: HardwareProfileKind;
};

const HardwareProfileDetailsPopover: React.FC<HardwareProfileDetailsPopoverProps> = ({
  tolerations,
  nodeSelector,
  resources,
  hardwareProfile,
}) => {
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

  const allResources = React.useMemo(() => {
    const requests = resources?.requests || {};
    const limits = resources?.limits || {};
    const identifiers = new Set([...Object.keys(requests), ...Object.keys(limits)]);

    return Array.from(identifiers).map((identifier) => ({
      identifier,
      request: requests[identifier]?.toString() || '',
      limit: limits[identifier]?.toString() || '',
      displayName: hardwareProfile?.spec.identifiers?.find((id) => id.identifier === identifier)
        ?.displayName,
      resourceType: hardwareProfile?.spec.identifiers?.find((id) => id.identifier === identifier)
        ?.resourceType,
    }));
  }, [resources, hardwareProfile]);

  if (!tolerations && !nodeSelector && !resources) {
    return null;
  }

  return (
    <Popover
      hasAutoWidth
      headerContent={
        hardwareProfile ? `${hardwareProfile.spec.displayName} details` : 'Existing settings'
      }
      bodyContent={
        <Stack hasGutter data-testid="hardware-profile-details">
          {hardwareProfile ? (
            hardwareProfile.spec.description && (
              <StackItem>
                <Truncate content={hardwareProfile.spec.description} />
              </StackItem>
            )
          ) : (
            <StackItem>No matching hardware profile found, using existing settings.</StackItem>
          )}

          {allResources.length > 0 &&
            allResources.map((resource) => (
              <StackItem key={resource.identifier}>
                {renderSection(resource.displayName || resource.identifier, [
                  formatResource(
                    resource.identifier,
                    formatResourceValue(resource.request, resource.resourceType).toString(),
                    formatResourceValue(resource.limit, resource.resourceType).toString(),
                  ),
                ])}
              </StackItem>
            ))}

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
        icon={<QuestionCircleIcon />}
        data-testid="hardware-profile-details-popover"
      >
        View details
      </Button>
    </Popover>
  );
};

export default HardwareProfileDetailsPopover;
