import React from 'react';
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ODHDoc, ODHDocType } from '../types';
import { getQuickStartLabel, launchQuickStart } from '../utilities/quickStartUtils';
import { getTextForDocType } from '../pages/learningCenter/learningCenterUtils';
import BrandImage from './BrandImage';

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

  const renderDocBadges = () => {
    const label = getTextForDocType(odhDoc.metadata.type as ODHDocType);
    if (odhDoc.metadata.type === ODHDocType.Documentation) {
      return (
        <>
          <div className="odh-card__partner-badge odh-m-doc odh-m-documentation">{label}</div>
          <div className="odh-card__partner-badge odh-m-doc m-hidden">N/A</div>
        </>
      );
    }
    if (odhDoc.metadata.type === ODHDocType.Tutorial) {
      return (
        <>
          <div className="odh-card__partner-badge odh-m-doc odh-m-tutorial">{label}</div>
          <div className="odh-card__partner-badge odh-m-doc">
            {odhDoc.spec.durationMinutes} minutes
          </div>
        </>
      );
    }
    if (odhDoc.metadata.type === ODHDocType.QuickStart) {
      const quickStart =
        qsContext.allQuickStarts &&
        qsContext.allQuickStarts.find((qs) => qs.metadata.name === odhDoc.metadata.name);
      if (!quickStart) {
        return null;
      }
      return (
        <>
          <div className="odh-card__partner-badge odh-m-doc odh-m-quick-start">{label}</div>
          <div className="odh-card__partner-badge odh-m-doc">
            {odhDoc.spec.durationMinutes} minutes
          </div>
        </>
      );
    }
    if (odhDoc.metadata.type === ODHDocType.HowTo) {
      return (
        <>
          <div className="odh-card__partner-badge odh-m-doc odh-m-how-to">{label}</div>
          <div className="odh-card__partner-badge odh-m-doc">
            {odhDoc.spec.durationMinutes} minutes
          </div>
        </>
      );
    }
    return null;
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
        <div className="odh-card__doc-badges">{renderDocBadges()}</div>
      </CardHeader>
      <CardTitle>{odhDoc.spec.displayName}</CardTitle>
      <CardBody>{odhDoc.spec.description}</CardBody>
      <CardFooter className="odh-card__footer">{renderDocLink()}</CardFooter>
    </Card>
  );
};

export default OdhDocCard;
