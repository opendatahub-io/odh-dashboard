import * as React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  List,
  ListItem,
  Progress,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import './DataProjects.scss';
import { OutlinedQuestionCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

type EnvironmentContentProps = {
  selectedProject: any;
};

const EnvironmentContent: React.FC<EnvironmentContentProps> = React.memo(({ selectedProject }) => {
  const environmentList = (environment, index) => (
    <div className="odh-data-projects-drawer-panel__environment" key={index}>
      <Flex>
        <FlexItem>
          <Title
            headingLevel="h3"
            size="lg"
            className="odh-data-projects-drawer-panel__environment-title"
          >
            {environment.name}
          </Title>
        </FlexItem>
        <FlexItem align={{ default: 'alignRight' }}>
          <Button isInline variant="link">
            Run
          </Button>
        </FlexItem>
        <FlexItem>
          <Button isInline variant="link">
            Duplicate
          </Button>
        </FlexItem>
      </Flex>
      <DescriptionList isHorizontal className="odh-data-projects-drawer-panel__environment-body">
        <DescriptionListGroup>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription>{environment.description}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Notebook image</DescriptionListTerm>
          <DescriptionListDescription>
            <span>{environment.image.name}</span>
            <Button
              variant="plain"
              isInline
              className="odh-data-projects-drawer-panel__environment-help-icon"
            >
              <OutlinedQuestionCircleIcon />
            </Button>
            <p className="odh-data-projects-drawer-panel__environment-help-text">
              {environment.image.version}
            </p>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Container Size</DescriptionListTerm>
          <DescriptionListDescription>
            <List isPlain>
              <ListItem>
                <p>{environment.containerSize.size}</p>
                <p className="odh-data-projects-drawer-panel__environment-help-text">
                  {environment.containerSize.cpu}
                </p>
              </ListItem>
              <ListItem>
                <p>Memory Requests</p>
                <p className="odh-data-projects-drawer-panel__environment-help-text">
                  {environment.containerSize.memory}
                </p>
              </ListItem>
            </List>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Storage</DescriptionListTerm>
          <DescriptionListDescription>
            <List isPlain>
              <ListItem>
                <Flex>
                  <FlexItem>{environment.storage.name}</FlexItem>
                  <FlexItem align={{ default: 'alignRight' }}>
                    <Button variant="link" isSmall isInline>
                      Access
                    </Button>
                  </FlexItem>
                </Flex>
              </ListItem>
              <ListItem>
                <Split hasGutter>
                  <SplitItem>{environment.storage.used}</SplitItem>
                  <SplitItem isFilled>
                    <Progress
                      measureLocation="outside"
                      value={87.5}
                      label={environment.storage.total}
                    />
                  </SplitItem>
                </Split>
              </ListItem>
              <ListItem>
                <Button variant="link" icon={<PlusCircleIcon />} isSmall isInline>
                  Add storage
                </Button>
              </ListItem>
            </List>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </div>
  );

  return (
    <div className="odh-data-projects-drawer-panel__tab-body">
      <Button variant="secondary">Create Environment</Button>
      {selectedProject.spec.environments
        ? selectedProject.spec.environments.map((environment, index) =>
            environmentList(environment, index),
          )
        : null}
    </div>
  );
});

EnvironmentContent.displayName = 'EnvironmentContent';

export default EnvironmentContent;
