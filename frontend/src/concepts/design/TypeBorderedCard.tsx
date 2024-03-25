import * as React from 'react';
import { css } from '@patternfly/react-styles';
import { Card, CardProps } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';

import './TypeBorderCard.scss';

type TypeBorderedCardProps = CardProps & {
  objectType?: ProjectObjectType;
  sectionType?: SectionType;
};
const TypeBorderedCard: React.FC<TypeBorderedCardProps> = ({
  objectType,
  sectionType,
  className,
  ...rest
}) => (
  <Card className={css(className, 'odh-type-bordered-card', sectionType, objectType)} {...rest} />
);

export default TypeBorderedCard;
