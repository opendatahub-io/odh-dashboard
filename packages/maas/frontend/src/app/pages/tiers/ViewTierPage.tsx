import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DashboardHelpTooltip from '@odh-dashboard/internal/concepts/dashboard/DashboardHelpTooltip';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
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
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetchSingleTier } from '~/app/hooks/useFetchSingleTier';
import { Tier } from '~/app/types/tier';
import DeleteTierModal from '~/app/pages/tiers/components/DeleteTierModal';

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
  const [tier, loaded, error] = useFetchSingleTier(tierName || '');
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [deleteTier, setDeleteTier] = React.useState<Tier | undefined>(undefined);

  if (loaded && !tier) {
    return <NotFound />;
  }

  return (
    <ApplicationsPage
      title={tier?.displayName || 'Loading...'}
      empty={false}
      loaded={loaded}
      loadError={error}
      breadcrumb={
        tier ? (
          <Breadcrumb>
            <BreadcrumbItem render={() => <Link to="/maas/tiers">Tiers</Link>} />
            <BreadcrumbItem isActive>{tier.displayName}</BreadcrumbItem>
          </Breadcrumb>
        ) : undefined
      }
      headerAction={
        tier ? (
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
              <DropdownItem data-testid="delete-tier-action" onClick={() => setDeleteTier(tier)}>
                Delete tier
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        ) : undefined
      }
    >
      {tier && (
        <Tabs activeKey="details" aria-label="Tier details tabs">
          <Tab eventKey="details" title={<TabTitleText>Details</TabTitleText>} aria-label="Details">
            <PageSection aria-label="Details">
              <Stack hasGutter>
                <SectionHeader title="Details" />
                <StackItem>
                  <Flex gap={{ default: 'gap2xl' }}>
                    <FlexItem style={{ minWidth: '600px' }}>
                      <DescriptionList>
                        <DetailsItem label="Name" value={tier.displayName} testId="tier-name" />
                      </DescriptionList>
                    </FlexItem>
                    <FlexItem>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm data-testid="tier-level-label">
                            Level{' '}
                            <DashboardHelpTooltip
                              content={
                                <Stack hasGutter>
                                  <StackItem>Higher numbers indicate higher tiers.</StackItem>
                                  <StackItem>
                                    When a user belongs to multiple groups, the highest level tier
                                    is selected.
                                  </StackItem>
                                  <StackItem>
                                    <strong>Example:</strong> 1 (lowest), 10 (medium), 100 (highest)
                                  </StackItem>
                                </Stack>
                              }
                            />
                          </DescriptionListTerm>
                          <DescriptionListDescription data-testid="tier-level-value">
                            <Label isCompact style={{ position: 'relative', top: '-10px' }}>
                              {tier.level ?? 0}
                            </Label>
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
                      value={tier.description}
                      testId="tier-description"
                    />
                  </DescriptionList>
                </StackItem>
              </Stack>
            </PageSection>

            <Divider />

            <PageSection aria-label="Groups">
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
                        tier.groups?.length && tier.groups.length > 0 ? (
                          <Stack>
                            {tier.groups.map((group) => (
                              <StackItem key={group}>{group}</StackItem>
                            ))}
                          </Stack>
                        ) : (
                          '-'
                        )
                      }
                      testId="tier-groups"
                    />
                  </DescriptionList>
                </StackItem>
              </Stack>
            </PageSection>

            <Divider />

            <PageSection aria-label="Limits">
              <Stack hasGutter>
                <SectionHeader
                  title="Limits"
                  description="These limits will apply to every API key created by users in this tier's groups."
                />
                <StackItem>
                  <Content className="pf-v6-u-font-weight-bold">Configured limits</Content>
                </StackItem>
                <StackItem>
                  <Stack hasGutter>
                    <StackItem>
                      <Stack>
                        <StackItem>
                          <Content className="pf-v6-u-font-weight-bold">Token limits:</Content>
                        </StackItem>
                        <StackItem style={{ paddingLeft: '15px', paddingTop: '5px' }}>
                          <Stack>
                            {tier.limits?.tokensPerUnit && tier.limits.tokensPerUnit.length > 0 ? (
                              tier.limits.tokensPerUnit.map((limit, index) => (
                                <StackItem key={index}>
                                  <Content>
                                    {`${limit.count.toLocaleString()} tokens per ${limit.time} ${limit.unit}`}
                                  </Content>
                                </StackItem>
                              ))
                            ) : (
                              <StackItem>
                                <Content>-</Content>
                              </StackItem>
                            )}
                          </Stack>
                        </StackItem>
                      </Stack>
                    </StackItem>
                    <StackItem>
                      <Stack>
                        <StackItem>
                          <Content className="pf-v6-u-font-weight-bold">
                            Request rate limits:
                          </Content>
                        </StackItem>
                        <StackItem style={{ paddingLeft: '15px', paddingTop: '5px' }}>
                          <Stack>
                            {tier.limits?.requestsPerUnit &&
                            tier.limits.requestsPerUnit.length > 0 ? (
                              tier.limits.requestsPerUnit.map((limit, index) => (
                                <StackItem key={index}>
                                  <Content>
                                    {`${limit.count.toLocaleString()} requests per ${limit.time} ${limit.unit}`}
                                  </Content>
                                </StackItem>
                              ))
                            ) : (
                              <StackItem>
                                <Content>-</Content>
                              </StackItem>
                            )}
                          </Stack>
                        </StackItem>
                      </Stack>
                    </StackItem>
                  </Stack>
                </StackItem>
              </Stack>
            </PageSection>
          </Tab>
        </Tabs>
      )}
      {deleteTier && (
        <DeleteTierModal
          tier={deleteTier}
          onClose={(deleted) => {
            setDeleteTier(undefined);
            if (deleted) {
              navigate('/maas/tiers');
            }
          }}
        />
      )}
    </ApplicationsPage>
  );
};

export default ViewTierPage;
