import React from 'react';
import classNames from 'classnames';
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
  disableInfo?: boolean;
};

const OdhExploreCard: React.FC<OdhExploreCardProps> = ({
  odhApp,
  isSelected,
  onSelect,
  disableInfo = false,
}) => {
  const disabled = odhApp.spec.comingSoon || disableInfo;
  const cardClasses = classNames('odh-card', { 'm-disabled': disabled });

  React.useEffect(() => {
    if (isSelected) {
      makeCardVisible(odhApp.metadata.name);
    }
  }, [odhApp.metadata.name, isSelected]);

  return (
    <Card
      id={odhApp.metadata.name}
      isHoverable={!disabled}
      isSelectable={!disabled}
      isSelected={isSelected}
      className={cardClasses}
      onClick={() => !disabled && onSelect()}
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
