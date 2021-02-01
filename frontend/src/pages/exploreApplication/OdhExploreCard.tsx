import React from 'react';
import {
  Brand,
  Card,
  CardHeader,
  CardHeaderMain,
  CardTitle,
  CardBody,
} from '@patternfly/react-core';

type OdhExploreCardProps = {
  odhApp: {
    label: string;
    description: string;
    img: string;
    docsLink: string;
  };
  isSelected: boolean;
  onSelect: () => void;
};

const OdhExploreCard: React.FC<OdhExploreCardProps> = ({ odhApp, isSelected, onSelect }) => {
  return (
    <Card
      isHoverable
      isSelectable
      isSelected={isSelected}
      className="odh-explore-card"
      onClick={onSelect}
    >
      <CardHeader>
        <CardHeaderMain>
          <Brand className="header-brand" src={odhApp.img} alt={odhApp.label} />
        </CardHeaderMain>
      </CardHeader>
      <CardTitle>{odhApp.label}</CardTitle>
      <CardBody>{odhApp.description}</CardBody>
    </Card>
  );
};

export default OdhExploreCard;
