import * as React from 'react';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
import { ProjectObjectType } from '~/concepts/design/utils';
import HeaderIcon from '~/concepts/design/HeaderIcon';
import ApplicationsPage from '~/pages/ApplicationsPage';
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
  getRedirectPath: (namespace: string) => string;
  children: React.ReactNode;
  labels?: React.ReactNode[];
};

const DetailsSection: React.FC<DetailsSectionProps> = ({
  actions,
  objectType,
  children,
  emptyState,
  getRedirectPath,
  id,
  isEmpty,
  isLoading,
  loadError,
  title,
  description,
  popover,
  labels,
}) => (
  <ApplicationsPage
    provideChildrenPadding
    loaded={!isLoading}
    loadError={loadError}
    empty={isEmpty}
    emptyStatePage={emptyState}
    getRedirectPath={getRedirectPath}
    title={
      <Flex
        direction={{ default: 'row' }}
        gap={{ default: 'gapSm' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        {objectType ? (
          <FlexItem>
            <HeaderIcon type={objectType} />
          </FlexItem>
        ) : null}
        {title ? (
          <FlexItem>
            <Title id={`${id}-title`} headingLevel="h2" size="xl">
              {title}
            </Title>
          </FlexItem>
        ) : null}
        {popover ? <FlexItem>{popover}</FlexItem> : null}
      </Flex>
    }
    description={description}
    headerAction={
      <Flex direction={{ default: 'column', md: 'row' }}>
        {actions && (
          <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
            {actions.map((action, index) => (
              <FlexItem data-testid="details-section-action" key={index}>
                {action}
              </FlexItem>
            ))}
          </Flex>
        )}
        {labels && <FlexItem align={{ default: 'alignRight' }}>{labels}</FlexItem>}
      </Flex>
    }
  >
    {children}
  </ApplicationsPage>
);

export default DetailsSection;
