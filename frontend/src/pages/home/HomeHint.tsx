import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  FlexItem,
  PageSection,
  Content,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '~/components/browserStorage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import ExternalLink from '~/components/ExternalLink';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const HomeHint: React.FC = () => {
  const [hintHidden, setHintHidden] = useBrowserStorage<boolean>(
    'odh.dashboard.landing.hint',
    false,
  );
  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  const releaseNoteDocumentation =
    'https://docs.redhat.com/en/documentation/red_hat_openshift_ai/2025';
  if (hintHidden || !isHardwareProfileAvailable) {
    return null;
  }

  return (
    <PageSection variant="secondary" hasBodyWrapper={false}>
      <Card data-testid="home-page-hint" style={{ borderRadius: 16 }}>
        <CardHeader>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <Content>
                <Content component="h2">
                  <TitleWithIcon
                    title={
                      <>
                        Hardware profiles, formerly &quot;Accelerator profiles&quot;, have new
                        features
                      </>
                    }
                    objectType={ProjectObjectType.acceleratorProfile}
                  />
                </Content>
              </Content>
            </FlexItem>
            <FlexItem>
              <Button
                icon={<TimesIcon />}
                data-testid="home-page-hint-close"
                aria-label="close landing page hint"
                isInline
                variant="plain"
                onClick={() => setHintHidden(true)}
              />
            </FlexItem>
          </Flex>
        </CardHeader>
        <CardBody style={{ maxWidth: 880 }}>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapMd' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <FlexItem>
              <Content>
                <Content component="p" data-testid="hint-body-text">
                  Hardware profiles offer more flexibility by enabling administrators to create
                  profiles for additional types of identifiers, limit workload resource allocations,
                  and target workloads to specific nodes by including tolerations and nodeSelectors
                  in profiles.
                </Content>
                <ExternalLink
                  text="Find the 2.19 release notes in the documentation"
                  to={releaseNoteDocumentation}
                />
              </Content>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>
    </PageSection>
  );
};

export default HomeHint;
