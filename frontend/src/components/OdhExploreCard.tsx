import React from 'react';
import * as classNames from 'ClassNames';
import { Brand, Card, CardHeader, CardTitle, CardBody } from '@patternfly/react-core';
import { ODHAppType } from '../types';

import './OdhCard.scss';

type OdhExploreCardProps = {
  odhApp: ODHAppType;
  isSelected: boolean;
  onSelect: () => void;
};

const OdhExploreCard: React.FC<OdhExploreCardProps> = ({ odhApp, isSelected, onSelect }) => {
  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-warning': odhApp.partner === '3rd party support',
  });
  return (
    <Card isHoverable isSelectable isSelected={isSelected} className="odh-card" onClick={onSelect}>
      <CardHeader>
        <Brand className="odh-card__header-brand" src={odhApp.img} alt={odhApp.label} />
        {odhApp.partner ? <span className={badgeClasses}>{odhApp.partner}</span> : null}
      </CardHeader>
      <CardTitle>
        {odhApp.label}
        {odhApp.provider ? (
          <div>
            <span className="odh-card__provider">by {odhApp.provider}</span>
          </div>
        ) : null}
      </CardTitle>
      <CardBody>{odhApp.description}</CardBody>
    </Card>
  );
};

export default OdhExploreCard;
