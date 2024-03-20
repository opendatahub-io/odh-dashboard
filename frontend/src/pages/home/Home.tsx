import * as React from 'react';
import { Button, Hint, HintBody, HintTitle, PageSection } from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { useAccessReview } from '~/api';
import { useBrowserStorage } from '~/components/browserStorage';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import ProjectsSection from './ProjectsSection';
import OrganizeSection from './OrganizeSection';
import QuickStartsSection from './QuickStartsSection';
import EnableTeamSection from './EnableTeamSection';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projectrequests',
  verb: 'create',
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [hintHidden, setHintHidden] = useBrowserStorage<boolean>(
    'odh.dashboard.landing.hint',
    false,
    false,
    false,
  );
  const [allowCreate, rbacLoaded] = useAccessReview(accessReviewResource);

  return (
    <>
      {!hintHidden ? (
        <PageSection>
          <Hint
            actions={
              <Button
                aria-label="close welcome info"
                isInline
                variant="plain"
                onClick={() => setHintHidden(true)}
              >
                <TimesIcon />
              </Button>
            }
          >
            <HintTitle>Welcome to your new home page</HintTitle>
            <HintBody>
              Your home page summarizes the projects you have access to, and includes helpful
              resources such as quick starts. The old{' '}
              <Button
                style={{ fontSize: 'initial' }}
                isInline
                component="a"
                variant="link"
                onClick={() => navigate('/applications')}
              >
                Enabled applications
              </Button>{' '}
              landing page, from which you can launch applications like Jupyter, is still accessible
              from the left navigation.
            </HintBody>
          </Hint>
        </PageSection>
      ) : null}
      <ProjectsSection
        allowCreate={rbacLoaded && allowCreate}
        style={{ paddingTop: !hintHidden ? 0 : undefined }}
      />
      <OrganizeSection allowCreateProjects={rbacLoaded && allowCreate} />
      <QuickStartsSection />
      <EnableTeamSection />
    </>
  );
};

export default Home;
