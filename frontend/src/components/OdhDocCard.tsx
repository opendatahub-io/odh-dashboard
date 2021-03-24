import React from 'react';
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ODHDoc, ODHDocType } from '../types';
import { getQuickStartLabel, launchQuickStart } from '../utilities/quickStartUtils';
import BrandImage from './BrandImage';
import DocCardBadges from './DocCardBadges';

import './OdhCard.scss';

type OdhDocCardProps = {
  odhDoc: ODHDoc;
};

const OdhDocCard: React.FC<OdhDocCardProps> = ({ odhDoc }) => {
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);

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
          Go to page
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
          How to?
          <ExternalLinkAltIcon />
        </a>
      );
    }
    return null;
  };

  return (
    <Card isHoverable className="odh-card">
      <CardHeader>
        <BrandImage src={odhDoc.spec.img || odhDoc.spec.icon || ''} alt={odhDoc.spec.displayName} />
      </CardHeader>
      <CardTitle className="odh-card__doc-title">
        {odhDoc.spec.displayName}
        <DocCardBadges odhDoc={odhDoc} />
      </CardTitle>
      <CardBody>{odhDoc.spec.description}</CardBody>
      <CardFooter className="odh-card__footer">{renderDocLink()}</CardFooter>
    </Card>
  );
};

export default OdhDocCard;
