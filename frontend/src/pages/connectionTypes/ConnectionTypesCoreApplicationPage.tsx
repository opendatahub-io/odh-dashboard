import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';

export type ConnectionTypesCoreApplicationPageProps = {
  children: React.ReactNode;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'loaded' | 'empty' | 'emptyStatePage' | 'headerContent' | 'provideChildrenPadding'
>;

const ConnectionTypesCoreApplicationPage: React.FC<ConnectionTypesCoreApplicationPageProps> = ({
  children,
  ...pageProps
}) => (
  <ApplicationsPage loaded empty={false} {...pageProps}>
    {children}
  </ApplicationsPage>
);

export default ConnectionTypesCoreApplicationPage;
