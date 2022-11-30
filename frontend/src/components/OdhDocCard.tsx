import React from 'react';
import classNames from 'classnames';
import {
  Card,
  CardActions,
  CardBody,
  CardFooter,
  CardHeader,
  CardHeaderMain,
  CardTitle,
  Stack,
  StackItem,
  Text,
  TextContent,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhDocument, OdhDocumentType } from '../types';
import {
  getLaunchStatus,
  getQuickStartLabel,
  launchQuickStart,
  LaunchStatusEnum,
} from '../utilities/quickStartUtils';
import BrandImage from './BrandImage';
import DocCardBadges from './DocCardBadges';
import { fireTrackingEvent } from '../utilities/segmentIOUtils';
import { useQuickStartCardSelected } from './useQuickStartCardSelected';
import { QuickStartContextValues } from '@patternfly/quickstarts';
import FavoriteButton from './FavoriteButton';

import './OdhCard.scss';

type OdhDocCardProps = {
  odhDoc: OdhDocument;
  favorite: boolean;
  updateFavorite: (isFavorite: boolean) => void;
};

// fire an event when any resource on the Resource page is accessed
const fireResourceAccessedEvent =
  (name: string, type: string, qsContext?: QuickStartContextValues) => () => {
    const quickStartLabel = getQuickStartLabel(name, qsContext);
    fireTrackingEvent(
      type === OdhDocumentType.QuickStart ? `Resource ${quickStartLabel}` : 'Resource Accessed',
      {
        name: name,
        type: type,
      },
    );
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
    fireResourceAccessedEvent(odhDoc.metadata.name, odhDoc.spec.type, qsContext)();
  };

  const renderDocLink = () => {
    if (odhDoc.spec.type === OdhDocumentType.Documentation) {
      return (
        <a
          className="odh-card__footer__link"
          href={odhDoc.spec?.url ?? '#'}
          onClick={fireResourceAccessedEvent(odhDoc.metadata.name, odhDoc.spec.type)}
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
          onClick={fireResourceAccessedEvent(odhDoc.metadata.name, odhDoc.spec.type)}
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
          onClick={fireResourceAccessedEvent(odhDoc.metadata.name, odhDoc.spec.type)}
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

  return (
    <Card
      data-id={odhDoc.metadata.name}
      id={odhDoc.metadata.name}
      role="article"
      isHoverable
      className="odh-card odh-tourable-card"
      isSelected={selected}
      isSelectable
    >
      <CardHeader>
        <CardHeaderMain style={{ maxWidth: '33%' }}>
          <BrandImage
            src={odhDoc.spec.img || odhDoc.spec.icon || ''}
            alt={odhDoc.spec.displayName}
          />
        </CardHeaderMain>
        <CardActions hasNoOffset>
          <FavoriteButton isFavorite={favorite} onClick={() => updateFavorite(!favorite)} />
        </CardActions>
      </CardHeader>
      <CardTitle>
        <TextContent>
          {odhDoc.spec.displayName}
          {/* Override the bold font in the title, make the subtitle lighter */}
          <Text component="small" style={{ fontWeight: 'var(--pf-global--FontWeight--normal)' }}>
            by {odhDoc.spec.appDisplayName}
          </Text>
        </TextContent>
      </CardTitle>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <DocCardBadges odhDoc={odhDoc} />
          </StackItem>
          <StackItem>
            <Tooltip removeFindDomNode content={odhDoc.spec.description}>
              <span className="odh-card__body-text">{odhDoc.spec.description}</span>
            </Tooltip>
          </StackItem>
        </Stack>
      </CardBody>
      <CardFooter className={footerClassName}>{renderDocLink()}</CardFooter>
    </Card>
  );
};

export default OdhDocCard;
