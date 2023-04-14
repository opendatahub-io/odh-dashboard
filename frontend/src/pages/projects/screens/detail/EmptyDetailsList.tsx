import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';

type EmptyDetailsListProps = {
  title: string;
  description: string;
  icon?: React.ComponentClass<SVGIconProps>;
};

const EmptyDetailsList: React.FC<EmptyDetailsListProps> = ({ title, description, icon }) => (
  <EmptyState variant="xs">
    <EmptyStateIcon icon={icon ?? CubesIcon} />
    <Title headingLevel="h3" size="lg">
      {title}
    </Title>
    <EmptyStateBody>{description}</EmptyStateBody>
  </EmptyState>
);

export default EmptyDetailsList;
