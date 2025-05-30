import React from 'react';
import classNames from 'classnames';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Stack,
  StackItem,
  Content,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { QuickStartContextValues } from '@patternfly/quickstarts';
import { OdhDocument, OdhDocumentType } from '#~/types';
import {
  getLaunchStatus,
  getQuickStartLabel,
  launchQuickStart,
  LaunchStatusEnum,
} from '#~/utilities/quickStartUtils';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import BrandImage from './BrandImage';
import DocCardBadges from './DocCardBadges';
import { useQuickStartCardSelected } from './useQuickStartCardSelected';
import FavoriteButton from './FavoriteButton';
import TruncatedText from './TruncatedText';

import './OdhCard.scss';

type OdhDocCardProps = {
  odhDoc: OdhDocument;
  showFavorite?: boolean;
  favorite?: boolean;
  updateFavorite?: (isFavorite: boolean) => void;
} & React.HTMLProps<HTMLElement>;

// fire an event when any resource on the Resource page is accessed
const fireResourceAccessedEvent =
  (name: string, type: string, qsContext?: QuickStartContextValues) => () => {
    const quickStartLabel = getQuickStartLabel(name, qsContext);
    fireMiscTrackingEvent(
      type === OdhDocumentType.QuickStart ? `Resource ${quickStartLabel}` : 'Resource Accessed',
      {
        name,
        type,
      },
    );
  };

const RIGHT_JUSTIFIED_STATUSES = [
  LaunchStatusEnum.Restart,
  LaunchStatusEnum.Continue,
  LaunchStatusEnum.Close,
];
const OdhDocCard: React.FC<OdhDocCardProps> = ({
  odhDoc,
  showFavorite = true,
  favorite = false,
  updateFavorite,
  ...rest
}) => {
  const [qsContext, selected] = useQuickStartCardSelected(
    odhDoc.metadata.name,
    odhDoc.metadata.name,
  );

  const cardClasses = classNames('odh-card odh-tourable-card', {
    'pf-m-current': selected,
  });
  const footerClassName = React.useMemo(() => {
    if (odhDoc.spec.type !== OdhDocumentType.QuickStart) {
      return 'odh-card__footer';
    }

    const qsStatus = getLaunchStatus(odhDoc.metadata.name, qsContext);
    return classNames('odh-card__footer', {
      'm-right-justified': RIGHT_JUSTIFIED_STATUSES.includes(qsStatus),
    });
  }, [odhDoc.metadata.name, odhDoc.spec.type, qsContext]);

  const onQuickStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    launchQuickStart(odhDoc.metadata.name, qsContext);
    fireResourceAccessedEvent(odhDoc.metadata.name, odhDoc.spec.type, qsContext)();
  };

  const renderDocLink = () => {
    if (odhDoc.spec.type === OdhDocumentType.Documentation) {
      return (
        <Button
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          variant="link"
          component="a"
          className="odh-card__footer__link"
          href={odhDoc.spec.url}
          onClick={fireResourceAccessedEvent(odhDoc.metadata.name, odhDoc.spec.type)}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="view-documentation"
        >
          View documentation
        </Button>
      );
    }
    if (odhDoc.spec.type === OdhDocumentType.Tutorial) {
      return (
        <Button
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          variant="link"
          component="a"
          className="odh-card__footer__link"
          href={odhDoc.spec.url}
          onClick={fireResourceAccessedEvent(odhDoc.metadata.name, odhDoc.spec.type)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Access tutorial
        </Button>
      );
    }
    if (odhDoc.spec.type === OdhDocumentType.QuickStart) {
      return (
        <Button
          variant="link"
          className="odh-card__footer__link"
          onClick={onQuickStart}
          data-testid="quick-start-button"
        >
          {getQuickStartLabel(odhDoc.metadata.name, qsContext)}
        </Button>
      );
    }
    if (odhDoc.spec.type === OdhDocumentType.HowTo) {
      return (
        <Button
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          variant="link"
          component="a"
          className="odh-card__footer__link"
          href={odhDoc.spec.url}
          onClick={fireResourceAccessedEvent(odhDoc.metadata.name, odhDoc.spec.type)}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="read-how-to-article"
        >
          Read how-to article
        </Button>
      );
    }
    return null;
  };

  return (
    <Card
      data-id={odhDoc.metadata.name}
      data-testid={`card ${odhDoc.metadata.name}`}
      id={odhDoc.metadata.name}
      className={cardClasses}
      {...rest}
    >
      <CardHeader
        actions={{
          actions: showFavorite ? (
            <FavoriteButton
              isFavorite={favorite}
              onClick={() => updateFavorite && updateFavorite(!favorite)}
            />
          ) : undefined,
          hasNoOffset: true,
          className: undefined,
        }}
      >
        <BrandImage src={odhDoc.spec.img || odhDoc.spec.icon || ''} alt="" />
      </CardHeader>
      <CardTitle>
        <Content>
          {odhDoc.spec.displayName}
          {/* Override the bold font in the title, make the subtitle lighter */}
          <Content
            component="small"
            style={{ fontWeight: 'var(--pf-t--global--font--weight--body--default)' }}
          >
            by {odhDoc.spec.appDisplayName}
          </Content>
        </Content>
      </CardTitle>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <DocCardBadges odhDoc={odhDoc} />
          </StackItem>
          <StackItem>
            <TruncatedText maxLines={4} content={odhDoc.spec.description} />
          </StackItem>
        </Stack>
      </CardBody>
      <CardFooter className={footerClassName}>{renderDocLink()}</CardFooter>
    </Card>
  );
};

export default OdhDocCard;
