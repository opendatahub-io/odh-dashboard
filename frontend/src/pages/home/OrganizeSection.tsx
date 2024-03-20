import * as React from 'react';
import {
  Bullseye,
  CardBody,
  Gallery,
  PageSection,
  PageSectionProps,
  Stack,
  Text,
  TextContent,
} from '@patternfly/react-core';
import projectIcon from '~/images/UI_icon-Red_Hat-Folder-Color.svg';
import pipelineIcon from '~/images/UI_icon-Red_Hat-Branch-Color.svg';
import chartIcon from '~/images/UI_icon-Red_Hat-Chart-Color.svg';
import TypeBorderedCard from '~/concepts/design/TypeBorderedCard';
import { SectionType } from '~/concepts/design/utils';
import OrganizeGallery from '~/pages/home/OrganizeGallery';
import PipelinesGallery from '~/pages/home/PipelinesGallery';
import ServingGallery from '~/pages/home/ServingGallery';

interface OrganizeCardProps {
  title: string;
  imgSrc: string;
  sectionType: SectionType;
  selected: boolean;
  onSelect: () => void;
}

const OrganizeCard: React.FC<OrganizeCardProps> = ({
  title,
  imgSrc,
  sectionType,
  selected,
  onSelect,
}) => (
  <TypeBorderedCard
    sectionType={sectionType}
    selectable
    selected={selected}
    onClick={() => onSelect()}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onSelect();
      }
    }}
    tabIndex={0}
  >
    <CardBody>
      <Stack hasGutter>
        <Bullseye>
          <img height={32} src={imgSrc} alt="" />
        </Bullseye>
        <Bullseye>{title}</Bullseye>
      </Stack>
    </CardBody>
  </TypeBorderedCard>
);

type OrganizeSectionProps = PageSectionProps & {
  allowCreateProjects: boolean;
};

const OrganizeSection: React.FC<OrganizeSectionProps> = ({ allowCreateProjects, ...rest }) => {
  const [selected, setSelected] = React.useState<string | undefined>();

  return (
    <PageSection data-testid="landing-page-organize" variant="light" {...rest}>
      <Stack hasGutter>
        <TextContent>
          <Text component="h1">
            Train, serve, monitor, and manage AI/ML models and AI-enabled applications
          </Text>
        </TextContent>
        <Gallery
          hasGutter
          minWidths={{ default: '100%', md: 'calc(33.33% - 2rem / 3)' }}
          maxWidths={{ default: '100%', md: 'calc(33.33% - 2rem / 3)' }}
        >
          {allowCreateProjects ? (
            <OrganizeCard
              title="Organize your work with projects"
              imgSrc={projectIcon}
              sectionType={SectionType.organize}
              selected={selected === 'organize'}
              onSelect={() => setSelected((prev) => (prev === 'organize' ? undefined : 'organize'))}
            />
          ) : null}
          <OrganizeCard
            title="Train models with pipelines"
            imgSrc={pipelineIcon}
            sectionType={SectionType.training}
            selected={selected === 'train'}
            onSelect={() => setSelected((prev) => (prev === 'train' ? undefined : 'train'))}
          />
          <OrganizeCard
            title="Deploy models and monitor for performance"
            imgSrc={chartIcon}
            sectionType={SectionType.serving}
            selected={selected === 'serving'}
            onSelect={() => setSelected((prev) => (prev === 'serving' ? undefined : 'serving'))}
          />
        </Gallery>
        {selected === 'organize' ? (
          <OrganizeGallery onClose={() => setSelected(undefined)} />
        ) : null}
        {selected === 'train' ? <PipelinesGallery onClose={() => setSelected(undefined)} /> : null}
        {selected === 'serving' ? <ServingGallery onClose={() => setSelected(undefined)} /> : null}
      </Stack>
    </PageSection>
  );
};

export default OrganizeSection;
