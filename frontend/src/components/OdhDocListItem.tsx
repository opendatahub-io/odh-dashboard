import React from 'react';
import * as classNames from 'classnames';
import { Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon, StarIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ODHDoc, ODHDocType } from '../types';
import { getQuickStartLabel, launchQuickStart } from '../utilities/quickStartUtils';
import { DOC_TYPE_TOOLTIPS } from '../utilities/const';
import { getDuration, makeCardVisible } from '../utilities/utils';

import './OdhListItem.scss';

type OdhDocCardProps = {
  odhDoc: ODHDoc;
  favorite: boolean;
  updateFavorite: (isFavorite: boolean) => void;
};

const OdhDocListItem: React.FC<OdhDocCardProps> = ({ odhDoc, favorite, updateFavorite }) => {
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

  const renderTypeBadge = () => {
    const docType = odhDoc?.metadata.type as ODHDocType;
    const typeBadgeClasses = classNames('odh-list-item__partner-badge odh-m-doc', {
      'odh-m-documentation': docType === ODHDocType.Documentation,
      'odh-m-tutorial': docType === ODHDocType.Tutorial,
      'odh-m-quick-start': docType === ODHDocType.QuickStart,
      'odh-m-how-to': docType === ODHDocType.HowTo,
    });
    return (
      <Tooltip content={DOC_TYPE_TOOLTIPS[docType]}>
        <div className={typeBadgeClasses}>{odhDoc.metadata.type}</div>
      </Tooltip>
    );
  };

  const renderDocLink = () => {
    let title;
    let href = odhDoc.spec?.url ?? '#';
    let external = true;
    let onClick;

    switch (odhDoc.metadata.type) {
      case ODHDocType.Documentation:
        title = 'View documentation';
        break;
      case ODHDocType.Tutorial:
        title = 'View documentation';
        break;
      case ODHDocType.QuickStart:
        title = getQuickStartLabel(odhDoc.metadata.name, qsContext);
        external = false;
        href = '#';
        onClick = onQuickStart;
        break;
      case ODHDocType.HowTo:
        title = 'Read how-to article';
        break;
      default:
        break;
    }
    const linkProps = external
      ? { target: 'noopener noreferrer', rel: 'noopener noreferrer' }
      : { onClick };
    return (
      <a className="odh-list-item__link" href={href} {...linkProps}>
        {title}
        {external ? <ExternalLinkAltIcon noVerticalAlign /> : null}
      </a>
    );
  };

  const favoriteClasses = classNames('odh-list-item__favorite odh-dashboard__favorite', {
    'm-is-favorite': favorite,
  });

  return (
    <>
      <div className={favoriteClasses} onClick={() => updateFavorite(!favorite)}>
        <StarIcon className="odh-dashboard__favorite__outer" />
        <StarIcon className="odh-dashboard__favorite__inner" />
      </div>
      <div className="odh-list-item__doc-text">
        <div id={odhDoc.metadata.name} className="odh-list-item__doc-title">
          {odhDoc.spec.displayName}
        </div>
        <div className="odh-list-item__doc-description">{odhDoc.spec.description}</div>
      </div>
      <div className="odh-list-item__doc-text">
        {odhDoc.spec.appDisplayName || ''}
        {odhDoc.spec.provider ? (
          <div className="odh-list-item__doc-description">by {odhDoc.spec.provider}</div>
        ) : null}
      </div>
      <div className="odh-list-item__doc-text">{renderTypeBadge()}</div>
      <div className="odh-list-item__doc-text">{getDuration(odhDoc.spec.durationMinutes)}</div>
      {renderDocLink()}
    </>
  );
};

export default OdhDocListItem;
