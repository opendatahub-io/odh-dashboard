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
      Documentation
      <ExternalLinkAltIcon />
    </DropdownItem>,
  ];

  if (odhApp.spec.link) {
    dropdownItems.push(
      <DropdownItem
        key="launch"
        className="odh-dashboard__external-link"
        href={odhApp.spec.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        Launch
        <ExternalLinkAltIcon />
      </DropdownItem>,
    );
  }

  const launchClasses = classNames('odh-card__footer__link', {
    'm-hidden': !odhApp.spec.link,
  });
  const quickStartClasses = classNames('odh-card__footer__link', {
    'm-hidden': !odhApp.spec.quickStart,
    'm-disabled':
      getLaunchStatus(odhApp.spec.quickStart || '', qsContext) === LaunchStatusEnum.Close,
  });

  const cardFooter = (
    <CardFooter className="odh-card__footer">
      <a
        className={launchClasses}
        href={odhApp.spec.link || '#'}
        target="_blank"
        rel="noopener noreferrer"
      >
        Launch
        <ExternalLinkAltIcon />
      </a>
      <a className={quickStartClasses} href="#" onClick={onQuickStart}>
        Quick start
      </a>
    </CardFooter>
  );

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
      <CardBody>{odhApp.spec.description}</CardBody>
      {cardFooter}
    </Card>
  );
};

export default OdhAppCard;
