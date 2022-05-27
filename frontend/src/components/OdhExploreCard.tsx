import React from 'react';
import classNames from 'classnames';
import { Card, CardHeader, CardBody } from '@patternfly/react-core';
import { OdhApplication } from '../types';
import { makeCardVisible } from '../utilities/utils';
import EnableModal from '../pages/exploreApplication/EnableModal';
import BrandImage from './BrandImage';
import SupportedAppTitle from './SupportedAppTitle';
import { useWatchDashboardConfig } from 'utilities/useWatchDashboardConfig';
import { ODH_PRODUCT_NAME } from '../utilities/const';

import './OdhCard.scss';

type OdhExploreCardProps = {
  odhApp: OdhApplication;
  isSelected: boolean;
  onSelect: () => void;
  disableInfo?: boolean;
  enableOpen: boolean;
  onEnableClose: () => void;
};

const OdhExploreCard: React.FC<OdhExploreCardProps> = ({
  odhApp,
  isSelected,
  onSelect,
  disableInfo = false,
  enableOpen,
  onEnableClose,
}) => {
  const disabled = odhApp.spec.comingSoon || disableInfo;
  const cardClasses = classNames('odh-card', { 'm-disabled': disabled });
  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-warning': odhApp.spec.category === 'Third party support',
    'm-hidden': odhApp.spec.category === ODH_PRODUCT_NAME,
  });
  const { dashboardConfig } = useWatchDashboardConfig();

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
        {!dashboardConfig.disableISVBadges ? (
          <div className="odh-card__explore-badges">
            {odhApp.spec.comingSoon ? (
              <span className="odh-card__coming-soon">Coming soon</span>
            ) : null}
            {!odhApp.spec.comingSoon && odhApp.spec.category ? (
              <span className={badgeClasses}>{odhApp.spec.category}</span>
            ) : null}
            {odhApp.spec.beta ? (
              <span className="odh-card__partner-badge odh-m-beta">Beta</span>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} showProvider />
      <CardBody>{odhApp.spec.description}</CardBody>
      <EnableModal shown={enableOpen} onClose={onEnableClose} selectedApp={odhApp} />
    </Card>
  );
};

export default OdhExploreCard;
