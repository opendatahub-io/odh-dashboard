import React from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Dropdown,
  DropdownItem,
  KebabToggle,
  Popover,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhApplication } from '../types';
import { getLaunchStatus, launchQuickStart, LaunchStatusEnum } from '../utilities/quickStartUtils';
import BrandImage from './BrandImage';
import SupportedAppTitle from './SupportedAppTitle';
import { useQuickStartCardSelected } from './useQuickStartCardSelected';
import EnableModal from '../pages/exploreApplication/EnableModal';
import { removeComponent } from '../services/componentsServices';
import { addNotification, forceComponentsUpdate } from '../redux/actions/actions';
import { useWatchDashboardConfig } from 'utilities/useWatchDashboardConfig';

import './OdhCard.scss';
import { ODH_PRODUCT_NAME } from 'utilities/const';

type OdhAppCardProps = {
  odhApp: OdhApplication;
};

const OdhAppCard: React.FC<OdhAppCardProps> = ({ odhApp }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [enableOpen, setEnableOpen] = React.useState(false);
  const [qsContext, selected] = useQuickStartCardSelected(
    odhApp.spec.quickStart,
    odhApp.metadata.name,
  );
  const disabled = !odhApp.spec.isEnabled;
  const { dashboardConfig } = useWatchDashboardConfig();
  const dispatch = useDispatch();

  const onToggle = (value) => {
    setIsOpen(value);
  };

  const onOpenKebab = () => {
    setIsOpen(!isOpen);
  };

  const onQuickStart = (e) => {
    e.preventDefault();
    launchQuickStart(odhApp.spec.quickStart, qsContext);
  };

  const removeApplication = () => {
    removeComponent(odhApp.metadata.name)
      .then((response) => {
        if (response.success) {
          dispatch(
            addNotification({
              status: 'success',
              title: `${odhApp.metadata.name} has been removed from the Enabled page.`,
              timestamp: new Date(),
            }),
          );
          dispatch(forceComponentsUpdate());
        } else {
          throw new Error(response.error);
        }
      })
      .catch((e) => {
        dispatch(
          addNotification({
            status: 'danger',
            title: `Error attempting to remove ${odhApp.metadata.name}.`,
            message: e.message,
            timestamp: new Date(),
          }),
        );
      });
  };

  const dropdownItems = [
    <DropdownItem
      key="docs"
      className="odh-dashboard__external-link"
      href={odhApp.spec.docsLink}
      target="_blank"
      rel="noopener noreferrer"
    >
      View documentation
      <ExternalLinkAltIcon />
    </DropdownItem>,
  ];

  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-warning': odhApp.spec.category === 'Third party support',
  });

  const quickStartClasses = classNames('odh-dashboard__external-link', {
    'm-hidden': !odhApp.spec.quickStart,
    'm-disabled':
      getLaunchStatus(odhApp.spec.quickStart || '', qsContext) === LaunchStatusEnum.Close,
  });

  if (odhApp.spec.quickStart) {
    dropdownItems.push(
      <DropdownItem key="quick-start" className={quickStartClasses} href="#" onClick={onQuickStart}>
        {`${getLaunchStatus(odhApp.spec.quickStart || '', qsContext)} quick start`}
      </DropdownItem>,
    );
  }

  const launchClasses = classNames('odh-card__footer__link', {
    'm-hidden': !odhApp.spec.link,
    'm-disabled': disabled,
  });

  const cardFooter = (
    <CardFooter className="odh-card__footer">
      <a
        className={launchClasses}
        href={odhApp.spec.link || '#'}
        target="_blank"
        rel="noopener noreferrer"
      >
        Launch application
        <ExternalLinkAltIcon />
      </a>
    </CardFooter>
  );

  const cardClasses = classNames('odh-card odh-tourable-card', {
    'm-disabled': disabled,
  });

  const popoverBodyContent = (hide) => (
    <div>
      Subscription is no longer valid. To validate click&nbsp;
      <Button
        isInline
        variant="link"
        onClick={() => {
          hide();
          setEnableOpen(true);
        }}
      >
        here
      </Button>
      . To remove card click&nbsp;
      <Button
        isInline
        variant="link"
        onClick={() => {
          hide();
          removeApplication();
        }}
      >
        here
      </Button>
      .
    </div>
  );

  const disabledPopover = (
    <Popover
      headerContent={<div className="odh-card__disabled-popover-title">Application disabled</div>}
      bodyContent={popoverBodyContent}
      position="bottom"
    >
      <span className="odh-card__disabled-text">Disabled</span>
    </Popover>
  );

  return (
    <Card
      id={odhApp.metadata.name}
      isHoverable={!disabled}
      className={cardClasses}
      isSelected={selected}
      isSelectable={!disabled}
    >
      <CardHeader>
        <BrandImage src={odhApp.spec.img} alt={odhApp.spec.displayName} />
        <div className="odh-card__enabled-controls">
          {disabled ? disabledPopover : null}
          <Dropdown
            onSelect={onOpenKebab}
            toggle={<KebabToggle onToggle={onToggle} />}
            isOpen={isOpen}
            isPlain
            dropdownItems={dropdownItems}
            position={'right'}
          />
        </div>
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} />
      <CardBody>
        {!dashboardConfig.disableISVBadges &&
        odhApp.spec.category &&
        odhApp.spec.category !== ODH_PRODUCT_NAME ? (
          <div className="odh-card__partner-badge-container">
            <span className={badgeClasses}>{odhApp.spec.category}</span>
          </div>
        ) : null}
        {odhApp.spec.description}
      </CardBody>
      {cardFooter}
      <EnableModal shown={enableOpen} onClose={() => setEnableOpen(false)} selectedApp={odhApp} />
    </Card>
  );
};

export default OdhAppCard;
