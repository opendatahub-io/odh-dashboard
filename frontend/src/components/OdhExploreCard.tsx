import React from 'react';
import classNames from 'classnames';
import { Card, CardBody, CardHeader, Flex, FlexItem, Label } from '@patternfly/react-core';
import { OdhApplication } from '#~/types';
import { makeCardVisible } from '#~/utilities/utils';
import EnableModal from '#~/pages/exploreApplication/EnableModal';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { useAppContext } from '#~/app/AppContext';
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
  const cardClasses = classNames('odh-card', { 'pf-m-disabled': disabled });
  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-hidden': odhApp.spec.support === ODH_PRODUCT_NAME,
    'odh-m-selectable': !disabled,
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
        className="pf-m-no-offset"
        {...(!dashboardConfig.spec.dashboardConfig.disableISVBadges && {
          actions: {
            hasNoOffset: true,
            actions: null,
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
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          gap={{ default: 'gapMd' }}
          direction={{ default: 'row' }}
          flexWrap={{ default: 'nowrap' }}
        >
          <BrandImage src={odhApp.spec.img} alt="" data-testid="brand-image" />
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
            direction={{ default: 'column' }}
          >
            {odhApp.spec.comingSoon && (
              <FlexItem className="odh-card__coming-soon">Coming soon</FlexItem>
            )}
            {!odhApp.spec.comingSoon && odhApp.spec.category && (
              <FlexItem className={badgeClasses} onClick={disabled ? undefined : onSelect}>
                <OdhExploreCardTypeBadge isDisabled={disabled} category={odhApp.spec.category} />
              </FlexItem>
            )}
            {odhApp.spec.beta && (
              <FlexItem className="odh-card__partner-badge odh-m-beta">
                <Label className={disabled ? 'pf-m-disabled' : undefined} color="yellow">
                  Beta
                </Label>
              </FlexItem>
            )}
          </Flex>
        </Flex>
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} showProvider />
      <CardBody data-testid="cardbody">{odhApp.spec.description}</CardBody>
      {enableOpen && (
        <EnableModal
          onClose={onEnableClose}
          selectedApp={odhApp}
          warningProps={
            odhApp.metadata.name === 'nvidia-nim'
              ? {
                  field: 'api_key',
                  validator: (value: string) => {
                    const regex = odhApp.spec.enable?.warningValidation?.validationRegex;
                    if (!regex) return false;
                    try {
                      const re = new RegExp(regex);
                      return re.test(value);
                    } catch (e) {
                      return false;
                    }
                  },
                  message:
                    "Looks like you're not using a Personal API key. For the best experience and continued access, consider using a Personal API Key instead. You can generate one at https://org.ngc.nvidia.com/setup/api-keys.",
                }
              : undefined
          }
        />
      )}
    </Card>
  );
};

export default OdhExploreCard;
