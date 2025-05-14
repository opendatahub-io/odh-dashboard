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
import { useBrowserStorage } from '~/components/browserStorage/BrowserStorageContext';
import aiFlowHintImage from '~/images/AIFlowHintImage.svg';
import { modelCustomizationRootPath } from '~/routes/pipelines/modelCustomization';

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
    <Card data-testid="ai-flow-hint">
      <Split>
        <SplitItem>
          <Flex
            flexWrap={{ default: 'wrap', lg: 'nowrap' }}
            justifyContent={{ default: 'justifyContentCenter' }}
          >
            <FlexItem flex={{ lg: 'flex_1' }}>
              <CardHeader>
                <Content component="h2">Customize starter models with the LAB method</Content>
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
            <FlexItem
              alignSelf={{
                default: 'alignSelfFlexEnd',
                lg: 'alignSelfCenter',
                xl: 'alignSelfFlexEnd',
              }}
              flex={{ lg: 'flex_1' }}
              style={{ height: '220px' }}
            >
              <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-v6-u-h-100">
                <img
                  data-testid="ai-flow-hint-image"
                  src={aiFlowHintImage}
                  alt="ai-flow-hint-image"
                  className="pf-v6-u-h-100"
                  style={{ maxWidth: 'unset' }}
                />
              </Flex>
            </FlexItem>
          </Flex>
        </SplitItem>
        <SplitItem isFilled>
          <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
            <FlexItem>
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
            </FlexItem>
          </Flex>
        </SplitItem>
      </Split>
    </Card>
  );
};

export default AIFlowHint;
