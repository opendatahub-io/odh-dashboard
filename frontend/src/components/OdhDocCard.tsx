import React from 'react';
import classNames from 'classnames';
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon, StarIcon } from '@patternfly/react-icons';
import { OdhDocument, OdhDocumentType } from '../types';
import {
  getLaunchStatus,
  getQuickStartLabel,
  launchQuickStart,
  LaunchStatusEnum,
} from '../utilities/quickStartUtils';
import BrandImage from './BrandImage';
import DocCardBadges from './DocCardBadges';
import { useQuickStartCardSelected } from './useQuickStartCardSelected';

import './OdhCard.scss';

type OdhDocCardProps = {
  odhDoc: OdhDocument;
  favorite: boolean;
  updateFavorite: (isFavorite: boolean) => void;
};

const RIGHT_JUSTIFIED_STATUSES = [
  LaunchStatusEnum.Restart,
  LaunchStatusEnum.Continue,
  LaunchStatusEnum.Close,
];
const OdhDocCard: React.FC<OdhDocCardProps> = ({ odhDoc, favorite, updateFavorite }) => {
  const [qsContext, selected] = useQuickStartCardSelected(
    odhDoc.metadata.name,
    odhDoc.metadata.name,
  );
  const footerClassName = React.useMemo(() => {
    if (odhDoc.spec.type !== OdhDocumentType.QuickStart) {
      return 'odh-card__footer';
    }

    const qsStatus = getLaunchStatus(odhDoc.metadata.name, qsContext);
    return classNames('odh-card__footer', {
      'm-right-justified': RIGHT_JUSTIFIED_STATUSES.includes(qsStatus),
    });
  }, [odhDoc.metadata.name, odhDoc.spec.type, qsContext]);

  const onQuickStart = (e) => {
    e.preventDefault();
    launchQuickStart(odhDoc.metadata.name, qsContext);
  };

  const renderDocLink = () => {
    if (odhDoc.spec.type === OdhDocumentType.Documentation) {
      return (
        <a
          className="odh-card__footer__link"
          href={odhDoc.spec?.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
        >
          View documentation
          <ExternalLinkAltIcon />
        </a>
      );
    }
    if (odhDoc.spec.type === OdhDocumentType.Tutorial) {
      return (
        <a
          className="odh-card__footer__link"
          href={odhDoc.spec?.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
        >
          Access tutorial
          <ExternalLinkAltIcon />
        </a>
      );
    }
    if (odhDoc.spec.type === OdhDocumentType.QuickStart) {
      return (
        <a className="odh-card__footer__link" href="#" onClick={onQuickStart}>
          {getQuickStartLabel(odhDoc.metadata.name, qsContext)}
        </a>
      );
    }
    if (odhDoc.spec.type === OdhDocumentType.HowTo) {
      return (
        <a
          className="odh-card__footer__link"
          href={odhDoc.spec?.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read how-to article
          <ExternalLinkAltIcon />
        </a>
      );
    }
    return null;
  };

  const favoriteClasses = classNames('odh-dashboard__favorite', { 'm-is-favorite': favorite });
  return (
    <Card
      id={odhDoc.metadata.name}
      isHoverable
      className="odh-card odh-tourable-card"
      isSelected={selected}
      isSelectable
    >
      <CardHeader>
        <BrandImage src={odhDoc.spec.img || odhDoc.spec.icon || ''} alt={odhDoc.spec.displayName} />
        <span className={favoriteClasses} onClick={() => updateFavorite(!favorite)}>
          <StarIcon className="odh-dashboard__favorite__outer" />
          <StarIcon className="odh-dashboard__favorite__inner" />
        </span>
      </CardHeader>
      <CardTitle className="odh-card__doc-title">
        {odhDoc.spec.displayName}
        <div className="odh-card__provider">by {odhDoc.spec.appDisplayName}</div>
        <DocCardBadges odhDoc={odhDoc} />
      </CardTitle>
      <CardBody>
        <Tooltip content={odhDoc.spec.description}>
          <span className="odh-card__body-text">{odhDoc.spec.description}</span>
        </Tooltip>
      </CardBody>
      <CardFooter className={footerClassName}>{renderDocLink()}</CardFooter>
    </Card>
  );
};

export default OdhDocCard;
