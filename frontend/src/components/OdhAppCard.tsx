import React from 'react';
import * as classNames from 'classnames';
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
    qsContext.setActiveQuickStart && qsContext.setActiveQuickStart(odhApp.spec.quickstart);
  };

  const dropdownItems = [
    <DropdownItem key="docs" href={odhApp.spec.docsLink} target="_blank" rel="noopener noreferrer">
      Documentation
    </DropdownItem>,
  ];

  if (odhApp.spec.link) {
    dropdownItems.push(
      <DropdownItem key="launch" href={odhApp.spec.link} target="_blank" rel="noopener noreferrer">
        Launch
      </DropdownItem>,
    );
  }

  const launchClasses = classNames('odh-card__footer__link', {
    'm-hidden': !odhApp.spec.link,
  });
  const quickStartClasses = classNames('odh-card__footer__link', {
    'm-hidden': !odhApp.spec.quickstart,
  });
  const cardFooter = (
    <CardFooter className="odh-card__footer">
      <a
        className={launchClasses}
        href={odhApp.spec.link || '#'}
        target="_blank"
        rel="noopener noreferrer"
      >
        {`Launch `}
        <ExternalLinkAltIcon />
      </a>
      <a className={quickStartClasses} href="#" onClick={onQuickStart}>
        Quick start
      </a>
    </CardFooter>
  );

  const supportedImageClasses = classNames('odh-card__supported-image', {
    'm-hidden': odhApp.spec.support !== 'redhat',
  });
  const badgeClasses = classNames('odh-card__partner-badge', {
    'm-warning': odhApp.spec.support === 'other',
  });

  return (
    <Card isHoverable className="odh-card">
      <CardHeader>
        <Brand
          className="odh-card__header-brand"
          src={odhApp.spec.img}
          alt={odhApp.spec.displayName}
        />
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
        {odhApp.spec.displayName}
        <Tooltip content="Red Hat Certified and Supported">
          <img
            className={supportedImageClasses}
            src="../images/CheckStar.svg"
            alt="Red Hat Certified and Supported"
          />
        </Tooltip>
      </CardTitle>
      <CardBody>
        {odhApp.spec.offering ? (
          <div className="odh-card__partner-badge-container">
            <span className={badgeClasses}>{odhApp.spec.offering}</span>
          </div>
        ) : null}
        {odhApp.spec.description}
      </CardBody>
      {cardFooter}
    </Card>
  );
};

export default OdhAppCard;
