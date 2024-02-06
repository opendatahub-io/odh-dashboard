import * as React from 'react';
import { Alert, Button } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';

const Home: React.FC = () => (
  <ApplicationsPage
    title="Introducing a new overview page"
    description="The overview page provides a summary view of projects and models in one place, along with information and links to help you accomplish tasks."
    loaded
    empty={false}
    provideChildrenPadding
  >
    <Alert
      variant="info"
      title="Welcome! We have added a new Home nav item placeholder that you are current on, and we made some update to the project details overview tab to introduce new concepts for workbenches, pipelines, and two project charts"
      style={{
        maxWidth: 1010,
        marginTop: 'var(--pf-v5-global--spacer--3xl)',
        marginLeft: 'var(--pf-v5-global--spacer--3xl)',
      }}
    >
      <p>
        We’re currently improving the content of this page based on{' '}
        <Button
          isInline
          variant="link"
          iconPosition="right"
          href="https://docs.google.com/presentation/d/1vZqskIWvsX1bZ-GReO92Y3M2zcThIUXpH3CbIuSbpIc/edit#slide=id.gffd5d723e8_0_0"
          target="_blank"
          rel="noopener noreferrer"
          component="a"
        >
          our research
        </Button>
        . If you have ideas for improvements, please share them through our{' '}
        <Button
          isInline
          variant="link"
          iconPosition="right"
          href="https://forms.gle/ETKuQSTAzvDCN6Uw6"
          target="_blank"
          rel="noopener noreferrer"
          component="a"
        >
          feedback form
        </Button>
        .
      </p>
    </Alert>
  </ApplicationsPage>
);

export default Home;
