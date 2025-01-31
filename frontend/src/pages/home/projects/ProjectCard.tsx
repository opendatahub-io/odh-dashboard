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
  Content,
  Timestamp,
  Truncate,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ProjectKind } from '~/k8sTypes';
import TruncatedText from '~/components/TruncatedText';
import { SectionType } from '~/concepts/design/utils';
import TypeBorderedCard from '~/concepts/design/TypeBorderedCard';
import { getProjectOwner } from '~/concepts/projects/utils';
import { fireLinkTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { AppContext } from '~/app/AppContext';
import FavoriteButton from '~/components/FavoriteButton';

interface ProjectCardProps {
  project: ProjectKind;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate();
  const { favoriteProjects, setFavoriteProjects } = React.useContext(AppContext);
  const isFavorite = favoriteProjects.includes(project.metadata.name);

  return (
    <TypeBorderedCard key={project.metadata.uid} sectionType={SectionType.organize}>
      <CardHeader>
        <Flex
          gap={{ default: 'gapMd' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          flexWrap={{ default: 'nowrap' }}
        >
          <FlexItem>
            <Button
              data-testid={`project-link-${project.metadata.name}`}
              variant="link"
              isInline
              onClick={() => {
                navigate(`/projects/${project.metadata.name}`);
                fireLinkTrackingEvent('HomeCardClicked', {
                  to: `/projects/${project.metadata.name}`,
                  type: 'project',
                });
              }}
              style={{ fontSize: 'var(--pf-t--global--font--size--body--default)' }}
            >
              <Truncate
                // TODO: Remove the inline style for underline once https://github.com/patternfly/patternfly/issues/7255 is resolved and PF versions are updated
                style={{ textDecoration: 'underline' }}
                content={getDisplayNameFromK8sResource(project)}
              />
            </Button>
          </FlexItem>
          <FlexItem>
            <FavoriteButton
              isFavorite={isFavorite}
              onClick={() => {
                if (isFavorite) {
                  setFavoriteProjects(
                    favoriteProjects.filter((fav) => fav !== project.metadata.name),
                  );
                } else {
                  setFavoriteProjects([...favoriteProjects, project.metadata.name]);
                }
              }}
            />
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        <Content>
          <Content component="small">
            <TruncatedText maxLines={3} content={getDescriptionFromK8sResource(project)} />
          </Content>
        </Content>
      </CardBody>
      <CardFooter>
        <DescriptionList isCompact>
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              {project.metadata.creationTimestamp ? (
                <Timestamp
                  date={new Date(project.metadata.creationTimestamp)}
                  style={{ color: 'var(--pf-t--global--text--color--regular)' }}
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
