import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '~/components/browserStorage';

type AIFlowHintProps = {
  title: React.ReactNode;
  body: React.ReactNode;
  isDisplayed: boolean;
  image: React.ReactNode;
};

const AIFlowHint: React.FC<AIFlowHintProps> = ({ title, body, isDisplayed, image }) => {
  const [hintHidden, setHintHidden] = useBrowserStorage<boolean>(
    `odh.dashboard.aiFlow.hint-ai-flows`,
    false,
  );

  if (hintHidden || !isDisplayed) {
    return null;
  }

  return (
    <Card data-testid="ai-flow-hint" style={{ borderRadius: 16 }}>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        flexWrap={{ default: 'wrap', lg: 'nowrap' }}
      >
        <FlexItem>
          <CardHeader>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
            >
              <FlexItem>
                <Content component="h2">{title}</Content>
              </FlexItem>
              <FlexItem className="pf-v6-u-display-inline pf-v6-u-display-none-on-lg">
                <Button
                  icon={<TimesIcon />}
                  data-testid="ai-flow-hint-close-md"
                  aria-label="close ai flow hint"
                  isInline
                  variant="plain"
                  onClick={() => setHintHidden(true)}
                />
              </FlexItem>
            </Flex>
          </CardHeader>
          <CardBody>{body}</CardBody>
        </FlexItem>
        <FlexItem>
          <CardBody>{image}</CardBody>
        </FlexItem>
        <FlexItem
          alignSelf={{ default: 'alignSelfFlexStart' }}
          className="pf-v6-u-display-none pf-v6-u-display-inline-on-lg"
        >
          <CardHeader>
            <Button
              icon={<TimesIcon />}
              data-testid="ai-flow-hint-close-lg"
              aria-label="close ai flow hint"
              isInline
              variant="plain"
              onClick={() => setHintHidden(true)}
            />
          </CardHeader>
        </FlexItem>
      </Flex>
    </Card>
  );
};

export default AIFlowHint;
