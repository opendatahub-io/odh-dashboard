import * as React from 'react';
import { Bullseye, CardBody, CardProps, Stack, Text, TextContent } from '@patternfly/react-core';
import TypeBorderedCard from '~/concepts/design/TypeBorderedCard';
import { SectionType } from '~/concepts/design/utils';

type AIFlowCardProps = {
  title: string;
  imgSrc: string;
  imgAlt: string;
  sectionType: SectionType;
  selected: boolean;
  onSelect: () => void;
} & CardProps;

const AIFlowCard: React.FC<AIFlowCardProps> = ({
  title,
  imgSrc,
  imgAlt,
  sectionType,
  selected,
  onSelect,
  ...rest
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
    {...rest}
  >
    <CardBody>
      <Stack hasGutter>
        <Bullseye>
          <img style={{ height: 32 }} src={imgSrc} alt={imgAlt} />
        </Bullseye>
        <Bullseye>
          <TextContent>
            <Text component="p" style={{ textAlign: 'center' }}>
              {title}
            </Text>
          </TextContent>
        </Bullseye>
      </Stack>
    </CardBody>
  </TypeBorderedCard>
);

export default AIFlowCard;
