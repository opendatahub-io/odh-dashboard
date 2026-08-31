import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  Label,
  PageSection,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon, CubesIcon, DisconnectedIcon, ServerIcon } from '@patternfly/react-icons';
import { useOpenShellConnection } from './OpenShellConnection';
import { NATIVE_PROVIDER_PATH, OPENSHELL_PROVIDER_PATH } from './providerRoutes';

const ProviderLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, connect } = useOpenShellConnection();
  const isConnected = state.status === 'connected';

  return (
    <>
      <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-lg">
        <Title headingLevel="h2" size="2xl">
          All providers
        </Title>
        <Content component="p" className="pf-v6-u-mt-sm pf-v6-u-mb-0">
          Pick where your sandboxes run. Providers differ in how you sign in, what scopes access,
          and what they can do.
        </Content>
      </PageSection>
      <PageSection hasBodyWrapper={false} isFilled>
        <Stack hasGutter>
          <StackItem>
            <Card isClickable isSelected data-testid="openshell-provider-card">
              <CardHeader
                selectableActions={{
                  selectableActionAriaLabel: 'Open OpenShell sandboxes',
                  onClickAction: () => navigate(OPENSHELL_PROVIDER_PATH),
                }}
              >
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
                  <FlexItem>
                    <ServerIcon className="pf-v6-u-primary-color-100 pf-v6-u-font-size-2xl" />
                  </FlexItem>
                  <FlexItem grow={{ default: 'grow' }}>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                      <FlexItem>
                        <Title headingLevel="h3" size="xl">
                          OpenShell
                        </Title>
                      </FlexItem>
                      <FlexItem>
                        <Label
                          color={isConnected ? 'green' : 'grey'}
                          icon={isConnected ? <CheckCircleIcon /> : <DisconnectedIcon />}
                        >
                          {isConnected
                            ? `Connected${state.username ? ` as ${state.username}` : ''}`
                            : 'Not connected'}
                        </Label>
                      </FlexItem>
                    </Flex>
                    <Content component="p" className="pf-v6-u-mt-sm pf-v6-u-mb-0">
                      Own sign-in · scoped by workspace · snapshots and egress policy
                    </Content>
                  </FlexItem>
                  {!isConnected && (
                    <FlexItem>
                      <Button
                        variant="primary"
                        isLoading={state.status === 'connecting'}
                        isDisabled={state.status === 'connecting'}
                        onClick={(event) => {
                          event.stopPropagation();
                          connect();
                        }}
                      >
                        Connect
                      </Button>
                    </FlexItem>
                  )}
                </Flex>
              </CardHeader>
            </Card>
          </StackItem>
          <StackItem>
            <Card isClickable data-testid="native-provider-card">
              <CardHeader
                selectableActions={{
                  selectableActionAriaLabel: 'Open agent sandbox CRs',
                  onClickAction: () => navigate(NATIVE_PROVIDER_PATH),
                }}
              >
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
                  <FlexItem>
                    <CubesIcon className="pf-v6-u-color-200 pf-v6-u-font-size-2xl" />
                  </FlexItem>
                  <FlexItem grow={{ default: 'grow' }}>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                      <FlexItem>
                        <Title headingLevel="h3" size="xl">
                          Agent sandbox CRs
                        </Title>
                      </FlexItem>
                    </Flex>
                    <Content component="p" className="pf-v6-u-mt-sm pf-v6-u-mb-0">
                      Uses your platform session · scoped by project · terminal and logs only
                    </Content>
                  </FlexItem>
                </Flex>
              </CardHeader>
            </Card>
          </StackItem>
        </Stack>
      </PageSection>
    </>
  );
};

export default ProviderLandingPage;
