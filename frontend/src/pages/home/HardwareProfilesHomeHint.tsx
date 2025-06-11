import * as React from 'react';
import { Content } from '@patternfly/react-core';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import ExternalLink from '#~/components/ExternalLink';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import HomeHint from './HomeHint';

const HardwareProfilesHomeHint: React.FC = () => {
  const releaseNoteDocumentation =
    'https://docs.redhat.com/en/documentation/red_hat_openshift_ai/2025';

  return (
    <HomeHint
      title={
        <TitleWithIcon
          title={
            <>Hardware profiles, formerly &quot;Accelerator profiles&quot;, have new features</>
          }
          objectType={ProjectObjectType.acceleratorProfile}
        />
      }
      body={
        <>
          <Content component="p" data-testid="hint-body-text">
            Hardware profiles offer more flexibility by enabling administrators to create profiles
            for additional types of identifiers, limit workload resource allocations, and target
            workloads to specific nodes by including tolerations and nodeSelectors in profiles.
          </Content>
          <ExternalLink
            text="Find the 2.19 release notes in the documentation"
            to={releaseNoteDocumentation}
          />
        </>
      }
      homeHintKey="hardware-profiles-intro"
      isDisplayed={useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status}
    />
  );
};

export default HardwareProfilesHomeHint;
