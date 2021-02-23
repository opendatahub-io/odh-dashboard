import React from 'react';
import * as classNames from 'ClassNames';
import {
  Brand,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  Dropdown,
  DropdownItem,
  KebabToggle,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ODHAppType } from '../types';

import './OdhCard.scss';

type OdhAppCardProps = {
  odhApp: ODHAppType;
};

const OdhAppCard: React.FC<OdhAppCardProps> = ({ odhApp }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);

  const onToggle = (value) => {
    setIsOpen(value);
  };

  const onSelect = () => {
    setIsOpen(!isOpen);
  };

  const onQuickStart = (e) => {
    e.preventDefault();
    qsContext.setActiveQuickStart && qsContext.setActiveQuickStart(odhApp.quickStart);
  };

  const dropdownItems = [
    <DropdownItem key="docs" href={odhApp.docsLink} target="_blank" rel="noopener noreferrer">
      Documentation
    </DropdownItem>,
  ];

  if (odhApp.link) {
    dropdownItems.push(
      <DropdownItem key="launch" href={odhApp.link} target="_blank" rel="noopener noreferrer">
        Launch
      </DropdownItem>,
    );
  }

  const launchClasses = classNames('odh-card__footer__link', {
    'm-hidden': !odhApp.link,
  });
  const quickStartClasses = classNames('odh-card__footer__link', {
    'm-hidden': !odhApp.quickStart,
  });
  const cardFooter = (
    <CardFooter className="odh-card__footer">
      <a className={launchClasses} href={odhApp.link} target="_blank" rel="noopener noreferrer">
        {`Launch `}
        <ExternalLinkAltIcon />
      </a>
      <a className={quickStartClasses} href="#" onClick={onQuickStart}>
        Quick start
      </a>
    </CardFooter>
  );

  const supportedImageClasses = classNames('odh-card__supported-image', {
    'm-hidden': odhApp.support !== 'redhat',
  });
  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-warning': odhApp.partner === '3rd party support',
  });

  return (
    <Card isHoverable className="odh-card">
      <CardHeader>
        <Brand className="odh-card__header-brand" src={odhApp.img} alt={odhApp.label} />
        <Dropdown
          onSelect={onSelect}
          toggle={<KebabToggle onToggle={onToggle} />}
          isOpen={isOpen}
          isPlain
          dropdownItems={dropdownItems}
          position={'right'}
        />
      </CardHeader>
      <CardTitle>
        {odhApp.label}
        <Tooltip content="Red Hat Certified and Supported">
          <img
            className={supportedImageClasses}
            src="../images/CheckStar.svg"
            alt="Red Hat Certified and Supported"
          />
        </Tooltip>
      </CardTitle>
      <CardBody>
        {odhApp.partner ? (
          <div className="odh-card__partner-badge-container">
            <span className={badgeClasses}>{odhApp.partner}</span>
          </div>
        ) : null}
        {odhApp.description}
      </CardBody>
      {cardFooter}
    </Card>
  );
};

export default OdhAppCard;
