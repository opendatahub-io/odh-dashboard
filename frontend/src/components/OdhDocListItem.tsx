import React from 'react';
import classNames from 'classnames';
import { Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhDocument, OdhDocumentType } from '~/types';
import { getQuickStartLabel, launchQuickStart } from '~/utilities/quickStartUtils';
import { DOC_TYPE_TOOLTIPS } from '~/utilities/const';
import { getDuration } from '~/utilities/utils';
import { useQuickStartCardSelected } from './useQuickStartCardSelected';
import FavoriteButton from './FavoriteButton';

import './OdhListItem.scss';

type OdhDocCardProps = {
  odhDoc: OdhDocument;
  favorite: boolean;
  updateFavorite: (isFavorite: boolean) => void;
};

const OdhDocListItem: React.FC<OdhDocCardProps> = ({ odhDoc, favorite, updateFavorite }) => {
  const [qsContext] = useQuickStartCardSelected(odhDoc.metadata.name, odhDoc.metadata.name);

  const onQuickStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    launchQuickStart(odhDoc.metadata.name, qsContext);
  };

  const renderTypeBadge = () => {
    const docType = odhDoc?.spec.type as OdhDocumentType;
    const typeBadgeClasses = classNames('odh-list-item__partner-badge odh-m-doc', {
      'odh-m-documentation': docType === OdhDocumentType.Documentation,
      'odh-m-tutorial': docType === OdhDocumentType.Tutorial,
      'odh-m-quick-start': docType === OdhDocumentType.QuickStart,
      'odh-m-how-to': docType === OdhDocumentType.HowTo,
    });
    return (
      <Tooltip removeFindDomNode content={DOC_TYPE_TOOLTIPS[docType]}>
        <div className={typeBadgeClasses}>{odhDoc.spec.type}</div>
      </Tooltip>
    );
  };

  const renderDocLink = () => {
    let title;
    let href = odhDoc.spec?.url ?? '#';
    let external = true;
    let onClick;

    switch (odhDoc.spec.type) {
      case OdhDocumentType.Documentation:
        title = 'View documentation';
        break;
      case OdhDocumentType.Tutorial:
        title = 'Access tutorial';
        break;
      case OdhDocumentType.QuickStart:
        title = getQuickStartLabel(odhDoc.metadata.name, qsContext);
        external = false;
        href = '#';
        onClick = onQuickStart;
        break;
      case OdhDocumentType.HowTo:
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

  return (
    <>
      <FavoriteButton isFavorite={favorite} onClick={() => updateFavorite(!favorite)} />
      <div className="odh-list-item__doc-text">
        <div id={odhDoc.metadata.name} className="odh-list-item__doc-title">
          <Tooltip removeFindDomNode content={odhDoc.spec.displayName}>
            <span>{odhDoc.spec.displayName}</span>
          </Tooltip>
        </div>
        <div className="odh-list-item__doc-description">
          <Tooltip removeFindDomNode content={odhDoc.spec.description}>
            <span>{odhDoc.spec.description}</span>
          </Tooltip>
        </div>
      </div>
      <div className="odh-list-item__doc-text">
        {odhDoc.spec.appDisplayName ? (
          <div
            id={`${odhDoc.spec.type}-${odhDoc.spec.displayName}`}
            className="odh-list-item__doc-title"
          >
            <Tooltip removeFindDomNode content={odhDoc.spec.appDisplayName}>
              <span>{odhDoc.spec.appDisplayName}</span>
            </Tooltip>
          </div>
        ) : null}
        {odhDoc.spec.provider ? (
          <div className="odh-list-item__doc-description">
            <Tooltip removeFindDomNode content={odhDoc.spec.provider}>
              <span>by {odhDoc.spec.provider}</span>
            </Tooltip>
          </div>
        ) : null}
      </div>
      <div className="odh-list-item__doc-text">{renderTypeBadge()}</div>
      <div className="odh-list-item__doc-text">{getDuration(odhDoc.spec.durationMinutes)}</div>
      {renderDocLink()}
    </>
  );
};

export default OdhDocListItem;
