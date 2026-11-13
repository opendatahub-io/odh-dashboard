import * as React from 'react';
import {
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  Popover,
} from '@patternfly/react-core';

/** The signed-in user's organization, from whoami; set only for an organization-scoped identity. */
export type CallerOrganization = { id: string; name: string };

/**
 * The caller's organization for the pages below it. Group names in an organization's subscriptions
 * are "<org-id>/<group>"; with this set, GroupName shows them by the organization's name.
 */
export const CallerOrganizationContext = React.createContext<CallerOrganization | undefined>(
  undefined,
);

/** The group's name inside the caller's organization, or undefined for any other group. */
const groupInOrganization = (
  name: string,
  organization: CallerOrganization | undefined,
): string | undefined =>
  organization && name.startsWith(`${organization.id}/`)
    ? name.slice(organization.id.length + 1)
    : undefined;

/** The group as text, "<org-name>/<group>" for the caller's organization (filter labels). */
export const groupLabel = (name: string, organization: CallerOrganization | undefined): string => {
  const inOrganization = groupInOrganization(name, organization);
  return organization && inOrganization !== undefined
    ? `${organization.name}/${inOrganization}`
    : name;
};

/**
 * A group's name. A group of the caller's organization shows the organization's name as a label,
 * whose popover has the organization's id to copy, then the group's own name. Any other group, and
 * every group for a user without an organization, shows its name as it is.
 */
export const GroupName: React.FC<{ name: string }> = ({ name }) => {
  const organization = React.useContext(CallerOrganizationContext);
  const inOrganization = groupInOrganization(name, organization);
  if (!organization || inOrganization === undefined) {
    return <>{name}</>;
  }
  return (
    <Flex
      spaceItems={{ default: 'spaceItemsSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'nowrap' }}
      data-testid="group-name"
    >
      <FlexItem>
        <Popover
          position="right"
          headerContent={organization.name}
          bodyContent={
            <DescriptionList isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>Organization ID</DescriptionListTerm>
                <DescriptionListDescription>
                  <ClipboardCopy
                    isReadOnly
                    variant="inline-compact"
                    hoverTip="Copy organization ID"
                    clickTip="Copied"
                  >
                    {organization.id}
                  </ClipboardCopy>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          }
        >
          <Label isCompact color="blue" onClick={() => undefined} data-testid="group-organization">
            {organization.name}
          </Label>
        </Popover>
      </FlexItem>
      <FlexItem>/</FlexItem>
      <FlexItem>{inOrganization}</FlexItem>
    </Flex>
  );
};
