import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
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
    <Card>
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
        <Content component="p" style={{ maxWidth: '620px' }}>
          Track your pipeline experiments with the embedded MLflow experience on the{' '}
          <strong>Experiments</strong> page, or launch MLflow in a new tab.
        </Content>
      </CardBody>
      <CardFooter>
        <Flex gap={{ default: 'gapMd' }}>
          <FlexItem>
            <Button variant="link" onClick={() => navigate('/develop-train/experiments-mlflow')}>
              Go to <strong>Experiments</strong>
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
      </CardFooter>
    </Card>
  );
};

export default MLflowCard;
