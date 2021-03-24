import React from 'react';
import * as classNames from 'classnames';
import { Card, CardHeader, CardBody } from '@patternfly/react-core';
import { ODHApp } from '../types';
import BrandImage from './BrandImage';
import SupportedAppTitle from './SupportedAppTitle';

import './OdhCard.scss';

type OdhExploreCardProps = {
  odhApp: ODHApp;
  isSelected: boolean;
  onSelect: () => void;
};

const OdhExploreCard: React.FC<OdhExploreCardProps> = ({ odhApp, isSelected, onSelect }) => {
  const cardClasses = classNames('odh-card', { 'm-disabled': odhApp.spec.comingSoon });
  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-warning': odhApp.spec.category === 'Third party support',
    'm-hidden': odhApp.spec.category === 'Red Hat',
  });

  return (
    <Card
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
        {!odhApp.spec.comingSoon && odhApp.spec.category ? (
          <span className={badgeClasses}>{odhApp.spec.category}</span>
        ) : null}
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} showProvider />
      <CardBody>{odhApp.spec.description}</CardBody>
    </Card>
  );
};

export default OdhExploreCard;
