import React from 'react';
import * as classNames from 'classnames';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Dropdown,
  DropdownItem,
  KebabToggle,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ODHApp, ODHDocType } from '../types';
import { getQuickStartLabel, launchQuickStart } from '../utilities/quickStartUtils';
import BrandImage from './BrandImage';
import SupportedAppTitle from './SupportedAppTitle';

import './OdhCard.scss';
import { makeCardVisible } from '../utilities/utils';

type OdhAppCardProps = {
  odhApp: ODHApp;
};

const OdhAppCard: React.FC<OdhAppCardProps> = ({ odhApp }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);

  const selected = React.useMemo(() => {
    return qsContext.activeQuickStartID === odhApp.spec.quickStart;
  }, [odhApp.spec.quickStart, qsContext.activeQuickStartID]);

  React.useEffect(() => {
    if (selected) {
      makeCardVisible(odhApp.metadata.name);
    }
  }, [odhApp.metadata.name, selected]);

  const onToggle = (value) => {
    setIsOpen(value);
  };

  const onOpenKebab = () => {
    setIsOpen(!isOpen);
  };

  const onQuickStart = (e) => {
    e.preventDefault();
    launchQuickStart(odhApp.spec.quickStart, qsContext);
    makeCardVisible(odhApp.metadata.name);
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
        {getQuickStartLabel(odhApp.spec.quickStart, qsContext)}
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
