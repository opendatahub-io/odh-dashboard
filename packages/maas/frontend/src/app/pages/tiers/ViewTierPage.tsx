import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  PageSection,
  Popover,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTiers } from '~/app/api/tiers';

type DetailsItemProps = {
  label: string;
  value: React.ReactNode;
  testId?: string;
};

const DetailsItem: React.FC<DetailsItemProps> = ({ label, value, testId }) => (
  <DescriptionListGroup>
    <DescriptionListTerm data-testid={testId ? `${testId}-label` : undefined}>
      {label}
    </DescriptionListTerm>
    <DescriptionListDescription data-testid={testId ? `${testId}-value` : undefined}>
      {value}
    </DescriptionListDescription>
  </DescriptionListGroup>
);

type SectionHeaderProps = {
  title: string;
  description?: string;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description }) => (
  <StackItem>
    <Content className="pf-v6-u-font-size-xl pf-v6-u-font-weight-bold">{title}</Content>
    {description && <Content className={text.textColorSubtle}>{description}</Content>}
  </StackItem>
);

const ViewTierPage: React.FC = () => {
  const { tierName } = useParams<{ tierName: string }>();
  const navigate = useNavigate();
  const tiers = useTiers();
  const tier = tiers.find((t) => t.name === tierName);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);

  return (
    <ApplicationsPage
      title={tier?.displayName}
      empty={false}
      loaded
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/maas/tiers">Tiers</Link>} />
          <BreadcrumbItem isActive>{tier?.displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
      headerAction={
        <Dropdown
          isOpen={isActionsOpen}
          onOpenChange={setIsActionsOpen}
          onSelect={() => setIsActionsOpen(false)}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              isExpanded={isActionsOpen}
              variant="secondary"
              aria-label="Actions"
              data-testid="tier-actions"
            >
              Actions
            </MenuToggle>
          )}
          popperProps={{ position: 'right' }}
        >
          <DropdownList>
            <DropdownItem
              data-testid="edit-tier-action"
              onClick={() => navigate(`/maas/tiers/edit/${tierName}`)}
            >
              Edit tier
            </DropdownItem>
            <Divider />
            <DropdownItem
              data-testid="delete-tier-action"
              onClick={() => {
                // TODO: Implement delete tier functionality
              }}
            >
              Delete tier
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      }
    >
      <Tabs activeKey="details" aria-label="Tier details tabs">
        <Tab eventKey="details" title={<TabTitleText>Details</TabTitleText>} aria-label="Details">
          <PageSection>
            <Stack hasGutter>
              <SectionHeader title="Details" />
              <StackItem>
                <Flex gap={{ default: 'gap2xl' }}>
                  <FlexItem style={{ minWidth: '600px' }}>
                    <DescriptionList>
                      <DetailsItem label="Name" value={tier?.displayName} testId="tier-name" />
                    </DescriptionList>
                  </FlexItem>
                  <FlexItem>
                    <DescriptionList>
                      <DescriptionListGroup>
                        <DescriptionListTerm data-testid="tier-level-label">
                          Level{' '}
                          <Popover
                            headerContent="Tier level"
                            bodyContent={
                              <Stack hasGutter>
                                <StackItem>Higher numbers indicate higher tiers.</StackItem>
                                <StackItem>
                                  When a user belongs to multiple groups, the highest level tier is
                                  selected.
                                </StackItem>
                                <StackItem>
                                  <strong>Example:</strong> 1 (lowest), 10 (medium), 100 (highest)
                                </StackItem>
                              </Stack>
                            }
                          >
                            <OutlinedQuestionCircleIcon style={{ cursor: 'pointer' }} />
                          </Popover>
                        </DescriptionListTerm>
                        <DescriptionListDescription data-testid="tier-level-value">
                          <Label isCompact>{tier?.level}</Label>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </FlexItem>
                </Flex>
              </StackItem>
              <StackItem>
                <DescriptionList>
                  <DetailsItem
                    label="Description"
                    value={tier?.description}
                    testId="tier-description"
                  />
                </DescriptionList>
              </StackItem>
            </Stack>
          </PageSection>

          <Divider />

          <PageSection>
            <Stack hasGutter>
              <SectionHeader
                title="Groups"
                description="Users in these groups will have access to this tier's models."
              />
              <StackItem>
                <DescriptionList>
                  <DetailsItem
                    label="Groups"
                    value={
                      tier?.groups &&
                      tier.groups.length > 0 && (
                        <Stack>
                          {tier.groups.map((group) => (
                            <StackItem key={group}>{group}</StackItem>
                            // Note: Originally supposed to link to the group section in the Openshift console, but we are stearing away from external links to the console.
                          ))}
                        </Stack>
                      )
                    }
                    testId="tier-groups"
                  />
                </DescriptionList>
              </StackItem>
            </Stack>
          </PageSection>

          <Divider />

          <PageSection>
            <Stack hasGutter>
              <SectionHeader
                title="Models"
                description="These models will be available to users who can access this tier."
              />
              <StackItem>
                <Content className="pf-v6-u-font-weight-bold">Available models</Content>
              </StackItem>
              <StackItem>
                {tier?.models && tier.models.length > 0 && (
                  <Stack>
                    {tier.models.map((model) => (
                      <StackItem key={model}>{model}</StackItem>
                    ))}
                  </Stack>
                )}
              </StackItem>
            </Stack>
          </PageSection>

          <Divider />

          <PageSection>
            <Stack hasGutter>
              <SectionHeader
                title="Limits"
                description="These limits will apply to every API key created by users in this tier's groups."
              />
              <StackItem>
                <Content className="pf-v6-u-font-weight-bold">Configured limits</Content>
              </StackItem>
              <StackItem>
                <Stack>
                  <StackItem>
                    <Content className="pf-v6-u-font-weight-bold">Token limits:</Content>
                    <Content>
                      {tier?.limits.tokensPerHour.toLocaleString()} tokens per 1 hour
                    </Content>
                  </StackItem>
                  <StackItem>
                    <Content className="pf-v6-u-font-weight-bold">Request rate limits:</Content>
                    <Content>
                      {tier?.limits.requestsPerMinute.toLocaleString()} requests per 1 minute
                    </Content>
                  </StackItem>
                </Stack>
              </StackItem>
            </Stack>
          </PageSection>
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default ViewTierPage;
