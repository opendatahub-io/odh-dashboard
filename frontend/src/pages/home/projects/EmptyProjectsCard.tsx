import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Content,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import getStartedImage from '#~/images/AI_ML-illustration-Blog-thumbnail.svg';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';

type EmptyProjectsCardProps = {
  allowCreate: boolean;
  onCreateProject: () => void;
};

const EmptyProjectsCard: React.FC<EmptyProjectsCardProps> = ({ allowCreate, onCreateProject }) => (
  <Card data-testid="landing-page-projects-empty" style={{ borderRadius: 16 }}>
    <CardBody>
      <Flex
        gap={{ default: 'gapLg' }}
        alignItems={{ default: 'alignItemsCenter' }}
        flexWrap={{ default: 'wrap', sm: 'nowrap' }}
      >
        <FlexItem flex={{ default: 'flexNone' }}>
          <img src={getStartedImage} alt="" style={{ width: 320 }} />
        </FlexItem>
        <FlexItem>
          <Stack hasGutter>
            <StackItem>
              <Content>
                <Content component="h1">Start by creating your project</Content>
                <Content component="p">
                  From workbenches to model servers, your project can be organized and customized to
                  meet your needs.
                  {!allowCreate ? ' To request a project, contact your administrator.' : null}
                </Content>
              </Content>
            </StackItem>
            {allowCreate ? (
              <StackItem>
                <Button
                  data-testid="create-project-button"
                  variant="primary"
                  icon={<ArrowRightIcon />}
                  iconPosition="right"
                  onClick={onCreateProject}
                >
                  Create a project
                </Button>
              </StackItem>
            ) : (
              <StackItem>
                <WhosMyAdministrator isInline />
              </StackItem>
            )}
          </Stack>
        </FlexItem>
      </Flex>
    </CardBody>
  </Card>
);

export default EmptyProjectsCard;
