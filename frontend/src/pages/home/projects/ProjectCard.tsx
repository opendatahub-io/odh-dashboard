import * as React from 'react';
import {
  Button,
  CardBody,
  CardFooter,
  CardHeader,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Text,
  TextContent,
  Timestamp,
  Truncate,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ProjectKind } from '~/k8sTypes';
import TruncatedText from '~/components/TruncatedText';
import { SectionType } from '~/concepts/design/utils';
import TypeBorderedCard from '~/concepts/design/TypeBorderedCard';
import { getProjectOwner } from '~/concepts/projects/utils';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { HomeCardTrackingEventProperties } from '~/concepts/analyticsTracking/trackingProperties';

interface ProjectCardProps {
  project: ProjectKind;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate();

  return (
    <TypeBorderedCard key={project.metadata.uid} sectionType={SectionType.organize}>
      <CardHeader>
        <Button
          data-testid={`project-link-${project.metadata.name}`}
          variant="link"
          isInline
          onClick={() => {
            navigate(`/projects/${project.metadata.name}`);
            fireTrackingEvent('HomeCardClicked', {
              to: `/projects/${project.metadata.name}`,
              type: 'project',
            } as HomeCardTrackingEventProperties);
          }}
          style={{ fontSize: 'var(--pf-v5-global--FontSize--md)' }}
        >
          <Truncate content={getDisplayNameFromK8sResource(project)} />
        </Button>
      </CardHeader>
      <CardBody>
        <TextContent>
          <Text component="small">
            <TruncatedText maxLines={3} content={getDescriptionFromK8sResource(project)} />
          </Text>
        </TextContent>
      </CardBody>
      <CardFooter>
        <DescriptionList isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              {project.metadata.creationTimestamp ? (
                <Timestamp
                  date={new Date(project.metadata.creationTimestamp)}
                  style={{ color: 'var(--pf-v5-global--Color--100)' }}
                />
              ) : (
                'Unknown'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Owner</DescriptionListTerm>
            <DescriptionListDescription>
              <Truncate content={getProjectOwner(project) || 'Unknown'} />
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </CardFooter>
    </TypeBorderedCard>
  );
};

export default ProjectCard;
