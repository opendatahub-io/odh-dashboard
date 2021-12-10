import React from 'react';
import classNames from 'classnames';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Dropdown,
  DropdownItem,
  KebabToggle,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhApplication } from '../types';
import { getLaunchStatus, launchQuickStart, LaunchStatusEnum } from '../utilities/quickStartUtils';
import BrandImage from './BrandImage';
import SupportedAppTitle from './SupportedAppTitle';
import { useQuickStartCardSelected } from './useQuickStartCardSelected';

import './OdhCard.scss';

type OdhAppCardProps = {
  odhApp: OdhApplication;
};

const OdhAppCard: React.FC<OdhAppCardProps> = ({ odhApp }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [qsContext, selected] = useQuickStartCardSelected(
    odhApp.spec.quickStart,
    odhApp.metadata.name,
  );

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

  const quickStartClasses = classNames('odh-dashboard__external-link', {
    'm-hidden': !odhApp.spec.quickStart,
    'm-disabled':
      getLaunchStatus(odhApp.spec.quickStart || '', qsContext) === LaunchStatusEnum.Close,
  });

  ('odh-dashboard__external-link');
  if (odhApp.spec.link) {
    dropdownItems.push(
      <DropdownItem key="quick-start" className={quickStartClasses} href="#" onClick={onQuickStart}>
        {`${getLaunchStatus(odhApp.spec.quickStart || '', qsContext)} quick start`}
      </DropdownItem>,
    );
  }

  const launchClasses = classNames('odh-card__footer__link', {
    'm-hidden': !odhApp.spec.link,
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

  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-warning': odhApp.spec.category === 'Third party support',
  });

  return (
    <Card
      id={odhApp.metadata.name}
      isHoverable
      className="odh-card odh-tourable-card"
      isSelected={selected}
      isSelectable
    >
      <CardHeader>
        <BrandImage src={odhApp.spec.img} alt={odhApp.spec.displayName} />
        <Dropdown
          onSelect={onOpenKebab}
          toggle={<KebabToggle onToggle={onToggle} />}
          isOpen={isOpen}
          isPlain
          dropdownItems={dropdownItems}
          position={'right'}
        />
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} />
      <CardBody>
        {odhApp.spec.category && odhApp.spec.category !== 'Red Hat' ? (
          <div className="odh-card__partner-badge-container">
            <span className={badgeClasses}>{odhApp.spec.category}</span>
          </div>
        ) : null}
        {odhApp.spec.description}
      </CardBody>
      {cardFooter}
    </Card>
  );
};

export default OdhAppCard;
