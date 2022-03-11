import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import BrandImage from 'components/BrandImage';
import * as React from 'react';

import '../DataProjects.scss';

type DatabaseProviderCardProps = {
  provider: any; // database provider type
  isSelected: boolean;
  onSelect: (event: React.MouseEvent) => void;
};

const DatabaseProviderCard: React.FC<DatabaseProviderCardProps> = ({
  provider,
  isSelected,
  onSelect,
}) => (
  <Card
    className="odh-data-projects__database-provider-card"
    id={provider.id}
    isSelectableRaised
    isSelected={isSelected}
    onClick={onSelect}
    isFlat
    isCompact
  >
    <CardTitle>
      <BrandImage src={provider.spec.img} alt={`${provider.spec.name} logo`} />
    </CardTitle>
    <CardBody>{provider.spec.name}</CardBody>
  </Card>
);

DatabaseProviderCard.displayName = 'DatabaseProviderCard';

export default DatabaseProviderCard;
