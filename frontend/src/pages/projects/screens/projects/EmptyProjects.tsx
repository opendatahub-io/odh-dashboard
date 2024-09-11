import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
  Popover,
  Button,
  Icon,
  TextContent,
  TextList,
  TextListItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import projectsEmptyStateImg from '~/images/empty-state-projects-color.svg';
import NewProjectButton from './NewProjectButton';

type EmptyProjectsProps = {
  allowCreate: boolean;
};

const EmptyProjects: React.FC<EmptyProjectsProps> = ({ allowCreate }) => {
  const navigate = useNavigate();

  return (
    <EmptyState variant="lg">
      <EmptyStateHeader
        data-testid="no-data-science-project"
        titleText={allowCreate ? 'Start by creating your project' : 'Start by requesting a project'}
        icon={
          <EmptyStateIcon
            icon={() => (
              <img style={{ height: 320 }} src={projectsEmptyStateImg} alt="no projects" />
            )}
          />
        }
        headingLevel="h2"
      />
      <EmptyStateBody data-testid="projects-empty-body-text">
        Projects allow you and your team to organize and collaborate on resources within separate
        namespaces.{!allowCreate ? ' To request a project, contact your administrator.' : ''}
      </EmptyStateBody>
      <EmptyStateFooter>
        {allowCreate ? (
          <>
            <NewProjectButton
              onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
            />
          </>
        ) : (
          <Popover
            minWidth="400px"
            headerContent="Your administrator might be:"
            bodyContent={
              <TextContent data-testid="projects-empty-admin-help-content">
                <TextList>
                  <TextListItem>The person who gave you your username</TextListItem>
                  <TextListItem>
                    Someone in your IT department or Help desk (at a company or school)
                  </TextListItem>
                  <TextListItem>
                    The person who manages your email service or web site (in a small business or
                    club)
                  </TextListItem>
                </TextList>
              </TextContent>
            }
          >
            <Button
              data-testid="projects-empty-admin-help"
              isInline
              variant="link"
              icon={
                <Icon isInline aria-label="More info">
                  <OutlinedQuestionCircleIcon />
                </Icon>
              }
            >
              {`Who's my administrator?`}
            </Button>
          </Popover>
        )}
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyProjects;
