import React from 'react';
import * as classNames from 'classnames';
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
    'm-warning': odhApp.spec.support === 'other',
  });
  return (
    <Card isHoverable isSelectable isSelected={isSelected} className="odh-card" onClick={onSelect}>
      <CardHeader>
        <Brand
          className="odh-card__header-brand"
          src={odhApp.spec.img}
          alt={odhApp.spec.displayName}
        />
        {odhApp.spec.offering ? <span className={badgeClasses}>{odhApp.spec.offering}</span> : null}
      </CardHeader>
      <CardTitle>
        {odhApp.spec.displayName}
        {odhApp.spec.provider ? (
          <div>
            <span className="odh-card__provider">by {odhApp.spec.provider}</span>
          </div>
        ) : null}
      </CardTitle>
      <CardBody>{odhApp.spec.description}</CardBody>
    </Card>
  );
};

export default OdhExploreCard;
