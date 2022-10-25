import * as React from 'react';
import { Divider, EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';

type EmptyDetailsListProps = {
  title: string;
  description: string;
  includeDivider?: boolean;
  icon?: React.ComponentClass<SVGIconProps>;
};

const EmptyDetailsList: React.FC<EmptyDetailsListProps> = ({
  title,
  description,
  includeDivider,
  icon,
}) => {
  return (
    <>
      <EmptyState variant="xs">
        <EmptyStateIcon icon={icon ?? CubesIcon} />
        <Title headingLevel="h5" size="lg">
          {title}
        </Title>
        <EmptyStateBody>{description}</EmptyStateBody>
      </EmptyState>
      {includeDivider && <Divider />}
    </>
  );
};

export default EmptyDetailsList;
