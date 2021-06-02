import React from 'react';
import * as classNames from 'classnames';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@patternfly/react-core';
import { ExternalLinkAltIcon, StarIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ODHDoc, ODHDocType } from '../types';
import {
  getLaunchStatus,
  getQuickStartLabel,
  launchQuickStart,
  LaunchStatusEnum,
} from '../utilities/quickStartUtils';
import BrandImage from './BrandImage';
import DocCardBadges from './DocCardBadges';
import { makeCardVisible } from '../utilities/utils';

import './OdhCard.scss';

type OdhDocCardProps = {
  odhDoc: ODHDoc;
  favorite: boolean;
  updateFavorite: (isFavorite: boolean) => void;
};

const RIGHT_JUSTIFIED_STATUSES = [
  LaunchStatusEnum.Restart,
  LaunchStatusEnum.Continue,
  LaunchStatusEnum.Close,
];
const OdhDocCard: React.FC<OdhDocCardProps> = ({ odhDoc, favorite, updateFavorite }) => {
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);

  const selected = React.useMemo(() => {
    return (
      odhDoc.metadata.type === ODHDocType.QuickStart &&
      qsContext.activeQuickStartID === odhDoc.metadata.name
    );
  }, [odhDoc.metadata.name, odhDoc.metadata.type, qsContext.activeQuickStartID]);

  React.useEffect(() => {
    if (selected) {
      makeCardVisible(odhDoc.metadata.name);
    }
  }, [odhDoc.metadata.name, selected]);

  const footerClassName = React.useMemo(() => {
    if (odhDoc.metadata.type !== ODHDocType.QuickStart) {
      return 'odh-card__footer';
    }

    const qsStatus = getLaunchStatus(odhDoc.metadata.name, qsContext);
    return classNames('odh-card__footer', {
      'm-right-justified': RIGHT_JUSTIFIED_STATUSES.includes(qsStatus),
    });
  }, [odhDoc.metadata.name, odhDoc.metadata.type, qsContext]);

  if (odhDoc.metadata.type === ODHDocType.QuickStart) {
    const quickStart = qsContext.allQuickStarts?.find(
      (qs) => qs.metadata.name === odhDoc.metadata.name,
    );
    if (!quickStart) {
      return null;
    }
  }

  const onQuickStart = (e) => {
    e.preventDefault();
    launchQuickStart(odhDoc.metadata.name, qsContext);
    makeCardVisible(odhDoc.metadata.name);
  };

  const renderDocLink = () => {
    if (odhDoc.metadata.type === ODHDocType.Documentation) {
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
    if (odhDoc.metadata.type === ODHDocType.Tutorial) {
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
    if (odhDoc.metadata.type === ODHDocType.QuickStart) {
      return (
        <a className="odh-card__footer__link" href="#" onClick={onQuickStart}>
          {getQuickStartLabel(odhDoc.metadata.name, qsContext)}
        </a>
      );
    }
    if (odhDoc.metadata.type === ODHDocType.HowTo) {
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
        <DocCardBadges odhDoc={odhDoc} />
      </CardTitle>
      <CardBody>{odhDoc.spec.description}</CardBody>
      <CardFooter className={footerClassName}>{renderDocLink()}</CardFooter>
    </Card>
  );
};

export default OdhDocCard;
