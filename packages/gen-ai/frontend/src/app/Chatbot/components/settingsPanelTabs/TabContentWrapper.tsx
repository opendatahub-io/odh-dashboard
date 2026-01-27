import * as React from 'react';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
import useDarkMode from '~/app/Chatbot/hooks/useDarkMode';

interface TabContentWrapperProps {
  title: string;
  headerActions?: React.ReactNode;
  /** Position of header actions: 'right' (default) pushes to far right, 'inline' keeps beside title */
  headerActionsPosition?: 'right' | 'inline';
  children: React.ReactNode;
  titleTestId?: string;
}

const TabContentWrapper: React.FunctionComponent<TabContentWrapperProps> = ({
  title,
  headerActions,
  headerActionsPosition = 'right',
  children,
  titleTestId,
}) => {
  const isDarkMode = useDarkMode();

  const tabContentStyle = React.useMemo(
    () => ({
      backgroundColor: isDarkMode
        ? 'var(--pf-v6-c-page__main-section--BackgroundColor)'
        : 'var(--pf-t--global--background--color--100)',
      padding: '1rem',
      /** Sets the max width for all tab content */
      maxWidth: '550px',
    }),
    [isDarkMode],
  );

  const useSpaceBetween = headerActions && headerActionsPosition === 'right';

  return (
    <div style={tabContentStyle}>
      <Flex
        justifyContent={{ default: useSpaceBetween ? 'justifyContentSpaceBetween' : undefined }}
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapSm' }}
        className="pf-v6-u-mt-sm pf-v6-u-mb-md"
        style={{ minHeight: 'var(--pf-t--global--spacer--xl)' }}
      >
        <FlexItem>
          <Title headingLevel="h2" size="md" data-testid={titleTestId}>
            {title}
          </Title>
        </FlexItem>
        {headerActions && <FlexItem>{headerActions}</FlexItem>}
      </Flex>
      {children}
    </div>
  );
};

export default TabContentWrapper;
