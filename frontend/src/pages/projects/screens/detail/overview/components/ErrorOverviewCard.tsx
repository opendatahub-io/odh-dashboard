import * as React from 'react';
import { Content, CardBody, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { getGenericErrorCode } from '#~/api/errorUtils.ts';
import OverviewCard, { OverviewCardProps } from './OverviewCard';

type ErrorOverviewCardProps = {
  error: Error;
} & Omit<OverviewCardProps, 'children' | 'data-testid'>;

const ErrorOverviewCard: React.FC<ErrorOverviewCardProps> = ({ error, ...props }) => {
  return (
    <OverviewCard {...props}>
      {getGenericErrorCode(error) === 403 ? (
        <CardBody>
          <Content component="small">
            To access {props.objectType}, ask your administrator to adjust your permissions.
          </Content>
        </CardBody>
      ) : (
        <EmptyState
          headingLevel="h3"
          icon={() => (
            <ExclamationCircleIcon
              style={{
                color: 'var(--pf-t--global--icon--color--status--danger--default)',
                width: '32px',
                height: '32px',
              }}
            />
          )}
          variant="xs"
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      )}
    </OverviewCard>
  );
};

export default ErrorOverviewCard;
