import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  PageSection,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '~/components/browserStorage/BrowserStorageContext';

type HomeHintProps = {
  title: React.ReactNode;
  body: React.ReactNode;
  isDisplayed: boolean;
  homeHintKey: string;
  image?: React.ReactNode;
};

const HomeHint: React.FC<HomeHintProps> = ({ title, body, isDisplayed, homeHintKey, image }) => {
  const [hintHidden, setHintHidden] = useBrowserStorage<boolean>(
    `odh.dashboard.landing.hint-${homeHintKey}`,
    false,
  );

  if (hintHidden || !isDisplayed) {
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
              <Content component="h2">{title}</Content>
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
            {image}
            <FlexItem>{body}</FlexItem>
          </Flex>
        </CardBody>
      </Card>
    </PageSection>
  );
};

export default HomeHint;
