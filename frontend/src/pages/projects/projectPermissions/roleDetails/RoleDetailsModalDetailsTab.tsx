import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTermHelpText,
  DescriptionListTermHelpTextButton,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  Popover,
  TabContentBody,
  FlexItem,
  Flex,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { HelpIcon, LockIcon } from '@patternfly/react-icons';
import InlineTruncatedClipboardCopy from '#~/components/InlineTruncatedClipboardCopy';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import RoleRulesTable from './RoleRulesTable';

type RoleDetailsModalDetailsTabProps = {
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
};

const RoleDetailsModalDetailsTab: React.FC<RoleDetailsModalDetailsTabProps> = ({
  roleRef,
  role,
}) => {
  if (!role) {
    return (
      <TabContentBody hasPadding>
        <EmptyState
          data-testid="role-details-access-denied"
          headingLevel="h3"
          titleText="No view access"
          icon={() => <LockIcon />}
          variant={EmptyStateVariant.sm}
        >
          <EmptyStateBody>
            You don’t have permission to access the details of this role. To request access, contact
            your administrator.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <WhosMyAdministrator />
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </TabContentBody>
    );
  }

  return (
    <TabContentBody hasPadding>
      <DescriptionList>
        <DescriptionListGroup>
          <DescriptionListTermHelpText>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>Role name</FlexItem>
              <FlexItem>
                <Popover bodyContent="This is the name of the role in OpenShift.">
                  <DescriptionListTermHelpTextButton
                    data-testid="openshift-name-help-button"
                    aria-label="More info for OpenShift name"
                  >
                    <HelpIcon />
                  </DescriptionListTermHelpTextButton>
                </Popover>
              </FlexItem>
            </Flex>
          </DescriptionListTermHelpText>
          <DescriptionListDescription>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <InlineTruncatedClipboardCopy
                  testId="role-details-openshift-name"
                  textToCopy={roleRef.name}
                />
              </FlexItem>
              {roleRef.kind === 'ClusterRole' ? (
                <FlexItem>
                  <Label isCompact variant="outline">
                    {roleRef.kind}
                  </Label>
                </FlexItem>
              ) : null}
            </Flex>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Rules</DescriptionListTerm>
          <DescriptionListDescription>
            <RoleRulesTable rules={role.rules} />
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </TabContentBody>
  );
};

export default RoleDetailsModalDetailsTab;
