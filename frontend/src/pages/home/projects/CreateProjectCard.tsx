import * as React from 'react';
import { Bullseye, Button, CardBody, Flex, FlexItem, Content } from '@patternfly/react-core';
import { SectionType } from '#~/concepts/design/utils';
import TypeBorderedCard from '#~/concepts/design/TypeBorderedCard';
import { ProjectIcon } from '#~/images/icons';

interface CreateProjectCardProps {
  allowCreate: boolean;
  onCreateProject: () => void;
}

const CreateProjectCard: React.FC<CreateProjectCardProps> = ({ allowCreate, onCreateProject }) => (
  <TypeBorderedCard
    data-testid={allowCreate ? 'create-project-card' : 'request-project-card'}
    sectionType={SectionType.organize}
  >
    <CardBody>
      <Bullseye>
        <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <ProjectIcon
              style={{ width: 54, height: 54, color: 'var(--pf-t--global--icon--color--subtle)' }}
            />
          </FlexItem>
          {allowCreate ? (
            <FlexItem>
              <Button variant="link" isInline onClick={onCreateProject}>
                Create project
              </Button>
            </FlexItem>
          ) : (
            <>
              <FlexItem>
                <Content>
                  <Content component="h3">Need another project?</Content>
                </Content>
              </FlexItem>
              <FlexItem>
                <Content>
                  <Content component="small" style={{ textAlign: 'center' }}>
                    Contact your administrator to request a project creation for you.
                  </Content>
                </Content>
              </FlexItem>
            </>
          )}
        </Flex>
      </Bullseye>
    </CardBody>
  </TypeBorderedCard>
);

export default CreateProjectCard;
