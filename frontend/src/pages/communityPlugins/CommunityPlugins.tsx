import * as React from 'react';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  List,
  ListItem,
  PageSection,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { RhUiPlugIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ExternalLink from '#~/components/ExternalLink';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import './CommunityPlugins.scss';

const COMMUNITY_PLUGINS_URL = 'https://red.ht/rh-ai-cp';
const COMMUNITY_PLUGINS_QUAY_URL = 'https://quay.io/organization/rh-ai-community-plugins';

const communityPluginsTitle = (
  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
    <FlexItem>
      <span className="odh-community-plugins__title-icon" aria-hidden>
        <RhUiPlugIcon />
      </span>
    </FlexItem>
    <FlexItem>Community plugins</FlexItem>
    <FlexItem>
      <Label color="orange">Unsupported</Label>
    </FlexItem>
  </Flex>
);

const CommunityPlugins: React.FC = () => (
  <ApplicationsPage
    loaded
    empty={false}
    title={communityPluginsTitle}
    breadcrumb={
      <Breadcrumb>
        <BreadcrumbItem>Settings</BreadcrumbItem>
        <BreadcrumbItem isActive>Community plugins</BreadcrumbItem>
      </Breadcrumb>
    }
  >
    <PageSection data-testid="community-plugins-page" hasBodyWrapper={false} isWidthLimited>
      <Stack hasGutter>
        <StackItem>
          <Grid hasGutter>
            <GridItem md={8}>
              <Alert
                isInline
                variant="warning"
                title="Community plugins are not supported by Red Hat."
              >
                Provided as-is with no SLA, no support entitlement, and no guarantee of
                compatibility, security review, or upgrade path. Enabling them exposes additional
                capabilities in the {ODH_PRODUCT_NAME} dashboard, including actions that can affect
                cluster resources.
              </Alert>
            </GridItem>
            <GridItem md={4}>
              <Card>
                <CardTitle>Related links</CardTitle>
                <CardBody>
                  <Stack hasGutter>
                    <StackItem>
                      <ExternalLink
                        text="Red Hat AI Community Plugins"
                        to={COMMUNITY_PLUGINS_URL}
                        testId="community-plugins-related-link"
                      />
                    </StackItem>
                    <StackItem>
                      <ExternalLink
                        text="Container registry (Quay)"
                        to={COMMUNITY_PLUGINS_QUAY_URL}
                        testId="community-plugins-quay-link"
                      />
                    </StackItem>
                  </Stack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </StackItem>
        <StackItem>
          <Card>
            <CardTitle>Description</CardTitle>
            <CardBody>
              Community plugins extend {ODH_PRODUCT_NAME} with optional capabilities that are not
              part of the supported product. They let you test new prototypes or add your own
              utilities directly to {ODH_PRODUCT_NAME} instead of using a separate interface. Once
              enabled on your cluster, Community plugins appear in the left navigation so users can
              discover and use them.
            </CardBody>
          </Card>
        </StackItem>
        <StackItem>
          <Card>
            <CardBody>
              <Stack hasGutter>
                <StackItem>
                  <Title headingLevel="h2" size="lg">
                    What you get when enabled
                  </Title>
                </StackItem>
                <StackItem>
                  <List>
                    <ListItem>A Community plugins entry in the left navigation</ListItem>
                    <ListItem>A catalog to discover and install community plugins</ListItem>
                    <ListItem>
                      Optional capabilities you can try in {ODH_PRODUCT_NAME} without leaving the
                      console
                    </ListItem>
                  </List>
                </StackItem>
                <StackItem>
                  <Title headingLevel="h2" size="lg">
                    How to enable community plugins
                  </Title>
                </StackItem>
                <StackItem>
                  <ExternalLink
                    text="View setup instructions"
                    to={COMMUNITY_PLUGINS_URL}
                    testId="community-plugins-setup-instructions"
                  />
                </StackItem>
                <StackItem>
                  After installation completes and the dashboard redeploys, refresh the console.
                  Confirm that the top-level Community plugins navigation appears.
                </StackItem>
                <StackItem>
                  <Title headingLevel="h2" size="lg">
                    Troubleshooting
                  </Title>
                </StackItem>
                <StackItem>
                  If Community plugins does not appear after refresh, [work with Andy on this
                  content].
                </StackItem>
              </Stack>
            </CardBody>
          </Card>
        </StackItem>
      </Stack>
    </PageSection>
  </ApplicationsPage>
);

export default CommunityPlugins;
