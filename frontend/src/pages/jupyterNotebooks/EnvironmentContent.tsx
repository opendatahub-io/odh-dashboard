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
  Popover,
  Progress,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import './DataProjects.scss';
import { OutlinedQuestionCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { mockImages, mockSizeDescriptions } from './mockData';

type EnvironmentContentProps = {
  selectedProject: any;
};

const EnvironmentContent: React.FC<EnvironmentContentProps> = React.memo(({ selectedProject }) => {
  const environmentList = (environment, index) => {
    const image = mockImages.find((image) => image.name === environment.image.name);
    if (!image || !image.tags) {
      return (
        <div className="odh-data-projects__drawer-panel-environment" key={index}>
          Image not available
        </div>
      );
    }
    const tag = (image.tags as any).find((tag) => tag.name === environment.image.tag);
    const sizeDescription = mockSizeDescriptions[`size/${environment.size}`];
    return (
      <div className="odh-data-projects__drawer-panel-environment" key={index}>
        <Flex>
          <FlexItem>
            <Title
              headingLevel="h3"
              size="lg"
              className="odh-data-projects__drawer-panel-environment-title"
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
        <DescriptionList isHorizontal className="odh-data-projects__drawer-panel-environment-body">
          <DescriptionListGroup>
            <DescriptionListTerm>Description</DescriptionListTerm>
            <DescriptionListDescription>{environment.description}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Notebook image</DescriptionListTerm>
            <DescriptionListDescription>
              <span>{image.display_name}</span>
              <Popover headerContent={image.description} bodyContent={null}>
                <Button
                  variant="plain"
                  isInline
                  className="odh-data-projects__drawer-panel-environment-help-icon"
                >
                  <OutlinedQuestionCircleIcon />
                </Button>
              </Popover>
              <p className="odh-data-projects__drawer-panel-environment-help-text">{tag.name}</p>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Container Size</DescriptionListTerm>
            <DescriptionListDescription>
              <List isPlain>
                <ListItem>
                  <p>{environment.size}</p>
                  <p className="odh-data-projects__drawer-panel-environment-help-text">
                    {`${sizeDescription.resources.limits.cpu} CPU, ${sizeDescription.resources.limits.memory} Memory`}
                  </p>
                </ListItem>
                <ListItem>
                  <p>Memory Requests</p>
                  <p className="odh-data-projects__drawer-panel-environment-help-text">
                    {`${sizeDescription.resources.requests.cpu} CPU, ${sizeDescription.resources.requests.memory} Memory`}
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
  };

  return (
    <div className="odh-data-projects__drawer-panel-tab-body">
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
