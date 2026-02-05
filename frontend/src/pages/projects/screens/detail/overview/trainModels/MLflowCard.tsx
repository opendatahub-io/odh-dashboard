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
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { MLFLOW_DEFAULT_PATH, setWorkspaceQueryParam } from '#~/routes/pipelines/mlflowExperiments';

const buildMLflowExperimentsWorkspaceHref = (href: string, projectName: string): string => {
  const base = href.replace(/\/+$/, '');
  const hashPath = setWorkspaceQueryParam(MLFLOW_DEFAULT_PATH, projectName);
  return `${base}/#${hashPath}`;
};

const MLflowCard: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { consoleLinks } = useWatchConsoleLinks();
  const mlflowLink = consoleLinks.find((link) => isMLflowConsoleLink(link.metadata?.name));
  const projectName = currentProject.metadata.name;

  if (!mlflowLink) {
    return null;
  }

  const mlflowWorkspaceHref = projectName
    ? buildMLflowExperimentsWorkspaceHref(mlflowLink.spec.href, projectName)
    : mlflowLink.spec.href;

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
            <Button
              data-testid="embedded-mlflow-experiments-link"
              variant="link"
              onClick={() => navigate('/develop-train/experiments-mlflow')}
            >
              Go to <strong>Experiments</strong>
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              data-testid="mlflow-jump-link"
              component="a"
              variant="link"
              href={mlflowWorkspaceHref}
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
