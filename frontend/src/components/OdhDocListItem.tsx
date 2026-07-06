import React from 'react';
import { Button, Tooltip, Label } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhDocument, OdhDocumentType } from '#~/types';
import { getQuickStartLabel, launchQuickStart } from '#~/utilities/quickStartUtils';
import { DOC_TYPE_TOOLTIPS } from '#~/utilities/const';
import { getLabelColorForDocType, asEnumMember, getDuration } from '#~/utilities/utils';
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
    const docType =
      asEnumMember(odhDoc.spec.type, OdhDocumentType) ?? OdhDocumentType.Documentation;
    return (
      <Tooltip content={DOC_TYPE_TOOLTIPS[docType]}>
        <Label color={getLabelColorForDocType(docType)}>{odhDoc.spec.type}</Label>
      </Tooltip>
    );
  };

  const renderDocLink = () => {
    let title;
    let href = odhDoc.spec.url;
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
      <Button
        component="a"
        isInline
        href={href}
        className="odh-list-item__link"
        variant="link"
        icon={external && <ExternalLinkAltIcon />}
        iconPosition="end"
        {...linkProps}
      >
        {title}
      </Button>
    );
  };

  return (
    <>
      <FavoriteButton isFavorite={favorite} onClick={() => updateFavorite(!favorite)} />
      <div className="odh-list-item__doc-text" data-testid={`list ${odhDoc.metadata.name}`}>
        <div id={odhDoc.metadata.name} className="odh-list-item__doc-title">
          <Tooltip content={odhDoc.spec.displayName}>
            <span>{odhDoc.spec.displayName}</span>
          </Tooltip>
        </div>
        <div className="odh-list-item__doc-description">
          <Tooltip content={odhDoc.spec.description}>
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
            <Tooltip content={odhDoc.spec.appDisplayName}>
              <span>{odhDoc.spec.appDisplayName}</span>
            </Tooltip>
          </div>
        ) : null}
        {odhDoc.spec.provider ? (
          <div className="odh-list-item__doc-description">
            <Tooltip content={odhDoc.spec.provider}>
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
