import * as React from 'react';
import { Bullseye, CardBody, Stack } from '@patternfly/react-core';
import TypeBorderedCard from '~/concepts/design/TypeBorderedCard';
import { SectionType } from '~/concepts/design/utils';

interface OrganizeCardProps {
  title: string;
  imgSrc: string;
  imgAlt: string;
  sectionType: SectionType;
  selected: boolean;
  onSelect: () => void;
}

const OrganizeCard: React.FC<OrganizeCardProps> = ({
  title,
  imgSrc,
  imgAlt,
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
          <img height={32} src={imgSrc} alt={imgAlt} />
        </Bullseye>
        <Bullseye>{title}</Bullseye>
      </Stack>
    </CardBody>
  </TypeBorderedCard>
);

export default OrganizeCard;
