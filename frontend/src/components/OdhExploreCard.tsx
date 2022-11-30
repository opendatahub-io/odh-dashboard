import React from 'react';
import classNames from 'classnames';
import {
  Card,
  CardHeader,
  CardBody,
  CardHeaderMain,
  CardActions,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { OdhApplication } from '../types';
import { makeCardVisible } from '../utilities/utils';
import EnableModal from '../pages/exploreApplication/EnableModal';
import BrandImage from './BrandImage';
import SupportedAppTitle from './SupportedAppTitle';
import { ODH_PRODUCT_NAME } from '../utilities/const';
import { useAppContext } from '../app/AppContext';

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
  const { dashboardConfig } = useAppContext();
  React.useEffect(() => {
    if (isSelected) {
      makeCardVisible(odhApp.metadata.name);
    }
  }, [odhApp.metadata.name, isSelected]);
  const disabled = odhApp.spec.comingSoon || disableInfo;
  const cardClasses = classNames('odh-card', { 'm-disabled': disabled });
  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-warning': odhApp.spec.category === 'Third party support',
    'm-hidden': odhApp.spec.category === ODH_PRODUCT_NAME,
  });

  return (
    <Card
      data-id={odhApp.metadata.name}
      id={odhApp.metadata.name}
      role="article"
      isHoverable={!disabled}
      isSelectable={!disabled}
      isSelected={isSelected}
      className={cardClasses}
      onClick={() => !disabled && onSelect()}
    >
      <CardHeader>
        <CardHeaderMain style={{ maxWidth: '33%' }}>
          <BrandImage src={odhApp.spec.img} alt={odhApp.spec.displayName} />
        </CardHeaderMain>
        {!dashboardConfig.spec.dashboardConfig.disableISVBadges && (
          <CardActions hasNoOffset>
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
              direction={{ default: 'column' }}
            >
              {odhApp.spec.comingSoon && (
                <FlexItem className="odh-card__coming-soon">Coming soon</FlexItem>
              )}
              {!odhApp.spec.comingSoon && odhApp.spec.category && (
                <FlexItem className={badgeClasses}>{odhApp.spec.category}</FlexItem>
              )}
              {odhApp.spec.beta && (
                <FlexItem className="odh-card__partner-badge odh-m-beta">Beta</FlexItem>
              )}
            </Flex>
          </CardActions>
        )}
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} showProvider />
      <CardBody>{odhApp.spec.description}</CardBody>
      <EnableModal shown={enableOpen} onClose={onEnableClose} selectedApp={odhApp} />
    </Card>
  );
};

export default OdhExploreCard;
