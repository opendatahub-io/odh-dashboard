import React from 'react';
import classNames from 'classnames';
import { Card, CardHeader, CardBody, Flex, FlexItem } from '@patternfly/react-core';
import { OdhApplication } from '~/types';
import { makeCardVisible } from '~/utilities/utils';
import EnableModal from '~/pages/exploreApplication/EnableModal';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { useAppContext } from '~/app/AppContext';
import BrandImage from './BrandImage';
import SupportedAppTitle from './SupportedAppTitle';
import OdhExploreCardTypeBadge from './OdhExploreCardTypeBadge';

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
    'm-hidden': odhApp.spec.support === ODH_PRODUCT_NAME,
  });

  return (
    <Card
      component="div"
      data-testid={`card ${odhApp.metadata.name}`}
      id={odhApp.metadata.name}
      role="listitem"
      isSelectable={!disabled}
      isSelected={isSelected}
      className={cardClasses}
    >
      <CardHeader
        {...(!dashboardConfig.spec.dashboardConfig.disableISVBadges && {
          actions: {
            actions: (
              <Flex
                spaceItems={{ default: 'spaceItemsSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
                direction={{ default: 'column' }}
              >
                {odhApp.spec.comingSoon && (
                  <FlexItem className="odh-card__coming-soon">Coming soon</FlexItem>
                )}
                {!odhApp.spec.comingSoon && odhApp.spec.category && (
                  <FlexItem className={badgeClasses}>
                    <OdhExploreCardTypeBadge category={odhApp.spec.category} />
                  </FlexItem>
                )}
                {odhApp.spec.beta && (
                  <FlexItem className="odh-card__partner-badge odh-m-beta">Beta</FlexItem>
                )}
              </Flex>
            ),
            hasNoOffset: true,
            className: undefined,
          },
          selectableActions: {
            selectableActionId: `${odhApp.metadata.name}-selectable-card-id`,
            selectableActionAriaLabelledby: odhApp.metadata.name,
            name: `odh-explore-selectable-card`,
            variant: 'single',
            isChecked: isSelected,
            onChange: () => !disabled && onSelect(),
          },
        })}
      >
        <BrandImage src={odhApp.spec.img} alt={odhApp.spec.displayName} data-testid="brand-image" />
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} showProvider />
      <CardBody data-testid="cardbody">{odhApp.spec.description}</CardBody>
      <EnableModal shown={enableOpen} onClose={onEnableClose} selectedApp={odhApp} />
    </Card>
  );
};

export default OdhExploreCard;
