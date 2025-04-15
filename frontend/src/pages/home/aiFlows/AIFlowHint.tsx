import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { Link } from 'react-router';
import { useBrowserStorage } from '~/components/browserStorage';
import aiFlowHintImage from '~/images/AIFlowHintImage.svg';
import { modelCustomizationRootPath } from '~/routes';

type AIFlowHintProps = {
  isDisplayed: boolean;
};

const AIFlowHint: React.FC<AIFlowHintProps> = ({ isDisplayed }) => {
  const [hintHidden, setHintHidden] = useBrowserStorage<boolean>(
    `odh.dashboard.aiFlow.hint-ai-flows`,
    false,
  );

  if (hintHidden || !isDisplayed) {
    return null;
  }

  return (
    <Card data-testid="ai-flow-hint" style={{ overflowY: 'hidden' }}>
      <Split>
        <SplitItem>
          <Flex flexWrap={{ default: 'wrap', '2xl': 'nowrap' }}>
            <FlexItem flex={{ '2xl': 'flex_1' }}>
              <CardHeader>
                <Flex>
                  <FlexItem>
                    <Content component="h2">Customize starter models with the LAB method</Content>
                  </FlexItem>
                </Flex>
              </CardHeader>
              <CardBody>
                <Content component="p" data-testid="ai-flow-hint-body-text">
                  LAB-tuning significantly reduces limitations associated with traditional
                  fine-tuning methods, such as high resource usage and time-consuming manual data
                  generation. The LAB method can enhance an LLM using far less human-generated
                  information and fewer computing resources than are usually required to retrain a
                  model.
                </Content>
                <Content>
                  <Link to={modelCustomizationRootPath} data-testid="ai-flow-hint-navigate">
                    Learn more about LAB-tuning
                  </Link>
                </Content>
              </CardBody>
            </FlexItem>
            <FlexItem alignSelf={{ default: 'alignSelfStretch' }} flex={{ '2xl': 'flex_1' }}>
              <img
                data-testid="ai-flow-hint-image"
                src={aiFlowHintImage}
                alt="ai-flow-hint-image"
                style={{
                  padding: '0 1.5rem',
                  maxWidth: '700px',
                  height: '100%',
                }}
              />
            </FlexItem>
          </Flex>
        </SplitItem>
        <SplitItem>
          <CardHeader>
            <Button
              icon={<TimesIcon />}
              data-testid="ai-flow-hint-close"
              aria-label="close ai flow hint"
              isInline
              variant="plain"
              onClick={() => setHintHidden(true)}
            />
          </CardHeader>
        </SplitItem>
      </Split>
    </Card>
  );
};

export default AIFlowHint;
