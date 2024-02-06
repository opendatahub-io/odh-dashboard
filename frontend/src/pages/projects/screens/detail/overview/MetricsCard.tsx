import * as React from 'react';
import { css } from '@patternfly/react-styles';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

type OverviewCardProps = {
  loading?: boolean;
  loadError?: Error;
  title: string;
  imgSrc?: string;
  imgAlt?: string;
  statistics: { count: number; text: string; onClick: () => void }[];
  allowCreate?: boolean;
  createButton?: React.ReactNode | false;
  createText?: string;
  onCreate?: () => void;
  typeModifier:
    | 'notebook'
    | 'pipeline'
    | 'cluster-storage'
    | 'model-server'
    | 'data-connections'
    | 'user'
    | 'group';
};
const MetricsCard: React.FC<OverviewCardProps> = ({
  loading,
  loadError,
  title,
  imgSrc,
  imgAlt,
  allowCreate,
  createButton,
  createText,
  onCreate,
  typeModifier,
  statistics,
}) => {
  if (loading) {
    return (
      <div className={css('odh-project-overview__metric-card loading', typeModifier)}>
        <EmptyState variant="xs">
          <EmptyStateHeader
            icon={<EmptyStateIcon icon={() => <Spinner size="lg" />} />}
            headingLevel="h3"
          />
          <EmptyStateBody>Loading...</EmptyStateBody>
        </EmptyState>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={css('odh-project-overview__metric-card error', typeModifier)}>
        <EmptyState variant="xs">
          <EmptyStateHeader
            icon={
              <EmptyStateIcon
                icon={() => (
                  <ExclamationCircleIcon
                    style={{
                      color: 'var(--pf-v5-global--danger-color--100)',
                      width: '32px',
                      height: '32px',
                    }}
                  />
                )}
              />
            }
            headingLevel="h3"
          />
          <EmptyStateBody>{loadError.message}</EmptyStateBody>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={css('odh-project-overview__metric-card', typeModifier)}>
      <div className="odh-project-overview__metric-card--title-area">
        <div className="odh-project-overview__metric-card--title-icon">
          <img src={imgSrc} alt={imgAlt} />
        </div>
        <h4>{title}</h4>
      </div>
      <div className="odh-project-overview__metric-card--statistics">
        {statistics.map((stats) => (
          <div key={stats.text} className="odh-project-overview__metric-card--statistic">
            <Button
              variant="link"
              className="odh-project-overview__metric-card--statistic-count"
              onClick={stats.onClick}
            >
              {stats.count}
            </Button>
            <div className="odh-project-overview__metric-card--statistic-text">{stats.text}</div>
          </div>
        ))}
      </div>
      <div className="odh-project-overview__metric-card--footer">
        {allowCreate ? (
          <>
            {createButton || (
              <Button variant="link" isInline onClick={onCreate}>
                {createText}
              </Button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default MetricsCard;
