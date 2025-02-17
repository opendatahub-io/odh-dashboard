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
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import { formatToleration, formatNodeSelector, formatResource } from './utils';

type HardwareProfileDetailsPopoverProps = {
  hardwareProfileConfig: HardwareProfileConfig;
};

const HardwareProfileDetailsPopover: React.FC<HardwareProfileDetailsPopoverProps> = ({
  hardwareProfileConfig,
}) => {
  const profile = hardwareProfileConfig.selectedProfile;

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
    const requests = hardwareProfileConfig.resources.requests || {};
    const limits = hardwareProfileConfig.resources.limits || {};
    const identifiers = new Set([...Object.keys(requests), ...Object.keys(limits)]);

    return Array.from(identifiers).map((identifier) => ({
      identifier,
      request: requests[identifier]?.toString() || '',
      limit: limits[identifier]?.toString() || '',
      displayName: profile?.spec.identifiers?.find((id) => id.identifier === identifier)
        ?.displayName,
    }));
  }, [hardwareProfileConfig.resources.requests, hardwareProfileConfig.resources.limits, profile]);

  if (!profile) {
    return null;
  }

  return (
    <Popover
      hasAutoWidth
      headerContent={`${profile.spec.displayName} details`}
      bodyContent={
        <Stack hasGutter data-testid="hardware-profile-details">
          {profile.spec.description && <StackItem>{profile.spec.description}</StackItem>}

          {allResources.length > 0 &&
            allResources.map((resource) => (
              <StackItem key={resource.identifier}>
                {renderSection(resource.displayName || resource.identifier, [
                  formatResource(resource.identifier, resource.request, resource.limit),
                ])}
              </StackItem>
            ))}

          {profile.spec.tolerations && profile.spec.tolerations.length > 0 && (
            <StackItem>
              {renderSection(
                'Tolerations',
                profile.spec.tolerations.map((toleration) => formatToleration(toleration)),
              )}
            </StackItem>
          )}

          {profile.spec.nodeSelector && (
            <StackItem>
              {renderSection('Node selectors', formatNodeSelector(profile.spec.nodeSelector))}
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
