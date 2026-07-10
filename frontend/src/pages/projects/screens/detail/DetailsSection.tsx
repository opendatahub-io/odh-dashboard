import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- wrapper re-export that injects host-specific error handling
import DetailsSectionBase from '@odh-dashboard/ui-core/components/detail/DetailsSection';
import { getGenericErrorCode } from '#~/api';
import UnauthorizedError from '#~/pages/UnauthorizedError';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { ProjectSectionID } from './types';

type DetailsSectionProps = {
  id: ProjectSectionID;
  actions?: React.ReactNode[];
  objectType?: ProjectObjectType;
  title?: string;
  description?: string;
  popover?: React.ReactNode;
  isLoading: boolean;
  loadError?: Error;
  isEmpty: boolean;
  emptyState: React.ReactNode;
  children: React.ReactNode;
  labels?: React.ReactNode[];
  showDivider?: boolean;
};

const DetailsSection: React.FC<DetailsSectionProps> = ({ loadError, id, ...rest }) => (
  <DetailsSectionBase
    id={id}
    loadError={loadError}
    unauthorizedContent={
      loadError && getGenericErrorCode(loadError) === 403 ? (
        <UnauthorizedError accessDomain={id} />
      ) : undefined
    }
    {...rest}
  />
);

export default DetailsSection;
