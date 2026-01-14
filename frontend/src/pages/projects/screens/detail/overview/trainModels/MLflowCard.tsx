import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils.ts';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { useWatchConsoleLinks } from '#~/utilities/useWatchConsoleLinks.tsx';
import { isMLflowConsoleLink } from '#~/app/AppLauncher.tsx';

const MLflowCard: React.FC = () => {
  const navigate = useNavigate();
  const { consoleLinks } = useWatchConsoleLinks();
  const mlflowLink = consoleLinks.find((link) => isMLflowConsoleLink(link.metadata?.name));

  if (!mlflowLink) {
    return null;
  }

  return (
    <Card isCompact>
      <CardHeader>
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <HeaderIcon type={ProjectObjectType.mlflow} sectionType={SectionType.training} />
          </FlexItem>
          <FlexItem>
            <Title headingLevel="h1" size="xl">
              Experiment tracking
            </Title>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
          <FlexItem>
            <Content>
              <Content component="p">
                Track your pipeline experiments with the embedded MLflow experience on the
                Experiments page, or launch MLflow in a new tab.
              </Content>
            </Content>
          </FlexItem>
          <FlexItem>
            <Flex gap={{ default: 'gapMd' }}>
              <FlexItem>
                <Button
                  variant="link"
                  onClick={() => navigate('/develop-train/experiments-mlflow')}
                >
                  Go to Experiments
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  component="a"
                  variant="link"
                  href={mlflowLink.spec.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="right"
                >
                  Launch MLflow
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default MLflowCard;
