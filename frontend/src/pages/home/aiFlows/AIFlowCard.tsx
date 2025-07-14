import * as React from 'react';
import { Bullseye, CardBody, CardHeader, CardProps, Stack, Content } from '@patternfly/react-core';
import TypeBorderedCard from '#~/concepts/design/TypeBorderedCard';
import { SectionType } from '#~/concepts/design/utils';

type AIFlowCardProps = {
  title: string;
  image: React.ReactNode;
  sectionType: SectionType;
  selected: boolean;
  onSelect: () => void;
} & CardProps;

const AIFlowCard: React.FC<AIFlowCardProps> = ({
  title,
  image,
  sectionType,
  selected,
  onSelect,
  ...rest
}) => (
  <TypeBorderedCard sectionType={sectionType} selectable selected={selected} {...rest}>
    <CardHeader
      selectableActions={{
        onClickAction: onSelect,
        selectableActionAriaLabel: title,
        selectableActionProps: { 'aria-expanded': selected },
      }}
    />
    <CardBody>
      <Stack hasGutter>
        <Bullseye>{image}</Bullseye>
        <Bullseye>
          <Content>
            <Content component="p" style={{ textAlign: 'center' }}>
              {title}
            </Content>
          </Content>
        </Bullseye>
      </Stack>
    </CardBody>
  </TypeBorderedCard>
);

export default AIFlowCard;
