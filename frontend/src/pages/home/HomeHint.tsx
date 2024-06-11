import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  FlexItem,
  PageSection,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import jupyterImg from '~/images/jupyter.svg';
import { useBrowserStorage } from '~/components/browserStorage';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { useCheckJupyterEnabled } from '~/utilities/notebookControllerUtils';

const HomeHint: React.FC = () => {
  const navigate = useNavigate();
  const [hintHidden, setHintHidden] = useBrowserStorage<boolean>(
    'odh.dashboard.landing.hint',
    false,
  );
  const jupyterEnabled = useCheckJupyterEnabled();

  if (hintHidden || !jupyterEnabled) {
    return null;
  }

  return (
    <PageSection>
      <Card data-testid="home-page-hint" style={{ borderRadius: 16 }}>
        <CardHeader>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <TextContent>
                <Text component="h2">Looking for the previous landing page?</Text>
              </TextContent>
            </FlexItem>
            <FlexItem>
              <Button
                data-testid="home-page-hint-close"
                aria-label="close landing page hint"
                isInline
                variant="plain"
                onClick={() => setHintHidden(true)}
              >
                <TimesIcon />
              </Button>
            </FlexItem>
          </Flex>
        </CardHeader>
        <CardBody style={{ maxWidth: 880 }}>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapMd' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <img
              data-testid="jupyter-hint-icon"
              src={jupyterImg}
              alt="Jupyter"
              style={{ height: 42, maxWidth: 'unset' }}
            />
            <FlexItem>
              <TextContent>
                <Text component="p" data-testid="hint-body-text">
                  {ODH_PRODUCT_NAME} has a new landing page. You can access applications that are
                  enabled for your organization, such as Jupyter, from the{' '}
                  <Button
                    data-testid="home-page-hint-navigate"
                    variant="link"
                    isInline
                    component="a"
                    style={{ fontSize: 'var(--pf-v5-global--FontSize--md)' }}
                    onClick={() => navigate('/enabled')}
                  >
                    Enabled applications
                  </Button>{' '}
                  page.
                </Text>
              </TextContent>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>
    </PageSection>
  );
};

export default HomeHint;
