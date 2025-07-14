import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Icon,
  Popover,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';

interface ProjectsSectionHeaderProps {
  showCreate: boolean;
  allowCreate: boolean;
  onCreateProject: () => void;
}

const ProjectsSectionHeader: React.FC<ProjectsSectionHeaderProps> = ({
  showCreate,
  allowCreate,
  onCreateProject,
}) => (
  <Flex
    gap={{ default: 'gapSm' }}
    alignItems={{ default: 'alignItemsCenter' }}
    justifyContent={{ default: 'justifyContentSpaceBetween' }}
  >
    <FlexItem>
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <HeaderIcon type={ProjectObjectType.project} sectionType={SectionType.organize} />
        </FlexItem>
        <FlexItem>
          <Content>
            <Content component={ContentVariants.h1}>Data Science Projects</Content>
          </Content>
        </FlexItem>
        {showCreate && !allowCreate ? (
          <FlexItem>
            <Popover
              headerContent={<div>Additional projects request</div>}
              bodyContent={
                <div>Contact your administrator to request a project creation for you.</div>
              }
            >
              <Icon
                data-testid="request-project-help"
                aria-label="Additional projects request"
                role="button"
              >
                <OutlinedQuestionCircleIcon />
              </Icon>
            </Popover>
          </FlexItem>
        ) : null}
      </Flex>
    </FlexItem>
    {showCreate && allowCreate ? (
      <FlexItem>
        <Button data-testid="create-project" variant="secondary" onClick={onCreateProject}>
          Create project
        </Button>
      </FlexItem>
    ) : null}
  </Flex>
);

export default ProjectsSectionHeader;
