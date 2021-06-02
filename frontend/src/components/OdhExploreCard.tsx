import React from 'react';
import * as classNames from 'classnames';
import { Card, CardHeader, CardBody } from '@patternfly/react-core';
import { OdhApplication } from '../types';
import BrandImage from './BrandImage';
import SupportedAppTitle from './SupportedAppTitle';
import { makeCardVisible } from '../utilities/utils';

import './OdhCard.scss';

type OdhExploreCardProps = {
  odhApp: OdhApplication;
  isSelected: boolean;
  onSelect: () => void;
};

const OdhExploreCard: React.FC<OdhExploreCardProps> = ({ odhApp, isSelected, onSelect }) => {
  const cardClasses = classNames('odh-card', { 'm-disabled': odhApp.spec.comingSoon });

  React.useEffect(() => {
    if (isSelected) {
      makeCardVisible(odhApp.metadata.name);
    }
  }, [odhApp.metadata.name, isSelected]);

  return (
    <Card
      id={odhApp.metadata.name}
      isHoverable={!odhApp.spec.comingSoon}
      isSelectable={!odhApp.spec.comingSoon}
      isSelected={isSelected}
      className={cardClasses}
      onClick={() => !odhApp.spec.comingSoon && onSelect()}
    >
      <CardHeader>
        <BrandImage
          className="odh-card__header-brand"
          src={odhApp.spec.img}
          alt={odhApp.spec.displayName}
        />
        {odhApp.spec.comingSoon ? <span className="odh-card__coming-soon">Coming soon</span> : null}
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} showProvider />
      <CardBody>{odhApp.spec.description}</CardBody>
    </Card>
  );
};

export default OdhExploreCard;
