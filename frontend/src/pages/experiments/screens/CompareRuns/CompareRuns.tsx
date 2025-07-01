import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage.tsx';
import { CompareRunsSearchParam } from '#~/routes/experiments/registryBase.ts';

type CompareRunsProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const CompareRuns: React.FC<CompareRunsProps> = ({ ...pageProps }) => {
  // get runs from query params
  const [searchParams] = useSearchParams();
  const runs = searchParams.get(CompareRunsSearchParam.RUNS);

  return (
    <ApplicationsPage
      {...pageProps}
      title="Compare runs"
      description="Compare runs"
      loaded
      provideChildrenPadding
    >
      WIP: {runs}
    </ApplicationsPage>
  );
};

export default CompareRuns;
