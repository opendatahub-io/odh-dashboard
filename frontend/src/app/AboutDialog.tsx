import React from 'react';
import { AboutModal, Alert, Bullseye, Spinner, Content } from '@patternfly/react-core';
import { ODH_LOGO, ODH_LOGO_DARK, ODH_PRODUCT_NAME } from '~/utilities/const';
import { useUser, useClusterInfo } from '~/redux/selectors';
import { useAppContext } from '~/app/AppContext';
import useFetchDsciStatus from '~/concepts/areas/useFetchDsciStatus';
import { useWatchOperatorSubscriptionStatus } from '~/utilities/useWatchOperatorSubscriptionStatus';
import { useThemeContext } from './ThemeContext';

const RhoaiAboutText = `Red Hat® OpenShift® AI (formerly Red Hat OpenShift Data Science) is a flexible, scalable MLOps platform for data scientists and developers of artificial intelligence and machine learning (AI/ML) applications. Built using open source technologies, OpenShift AI supports the full lifecycle of AI/ML experiments and models, on premise and in the public cloud.`;
const RhoaiDefaultReleaseName = `OpenShift AI`;

const OdhAboutText = `Open Data Hub is an open source AI platform designed for the hybrid cloud. The community seeks to bridge the gap between application developers, data stewards, and data scientists by blending the leading open source AI tools with a unifying and intuitive user experience. Open Data Hub supports the full lifecycle of AI/ML experiments and models.`;
const OdhDefaultReleaseName = `Open Data Hub`;

interface AboutDialogProps {
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ onClose }) => {
  const { isAdmin } = useUser();
  const { isRHOAI } = useAppContext();
  const { theme } = useThemeContext();
  const { serverURL } = useClusterInfo();
  const [dsciStatus, loadedDsci, errorDsci] = useFetchDsciStatus();
  const [subStatus, loadedSubStatus, errorSubStatus] = useWatchOperatorSubscriptionStatus();
  const error = errorDsci || errorSubStatus;
  const loading = (!errorDsci && !loadedDsci) || (!errorSubStatus && !loadedSubStatus);

  return (
    <AboutModal
      className="odh-about-dialog"
      isOpen
      onClose={onClose}
      brandImageSrc={`${window.location.origin}/images/${
        theme !== 'dark' ? ODH_LOGO : ODH_LOGO_DARK
      }`}
      brandImageAlt={`${ODH_PRODUCT_NAME} logo`}
      productName={ODH_PRODUCT_NAME}
      aria-label={ODH_PRODUCT_NAME}
      data-testid="odh-about-dialog"
    >
      <Content style={{ paddingBottom: 48 }}>
        <h4>About</h4>
        <p data-testid="about-text">{isRHOAI ? RhoaiAboutText : OdhAboutText}</p>
      </Content>
      <Content>
        <div style={{ position: 'relative' }}>
          {loading ? (
            <Bullseye style={{ position: 'absolute', width: '100%' }}>
              <Spinner size="xl" />
            </Bullseye>
          ) : null}
          <Content component="dl" style={{ visibility: loading ? 'hidden' : 'visible' }}>
            <Content component="dt" data-testid="about-product-name">
              {dsciStatus?.release?.name ||
                (isRHOAI ? RhoaiDefaultReleaseName : OdhDefaultReleaseName)}{' '}
              version
            </Content>
            <Content component="dd" data-testid="about-version">
              {dsciStatus?.release?.version || 'Unknown'}
            </Content>
            <Content component="dt">Channel</Content>
            <Content component="dd" data-testid="about-channel">
              {subStatus?.channel || 'Unknown'}
            </Content>
            <Content component="dt">API server</Content>
            <Content component="dd" data-testid="about-server-url">
              {serverURL}
            </Content>
            <Content component="dt">User type</Content>
            <Content component="dd" data-testid="about-access-level">
              {isAdmin ? 'Administrator' : 'Non-administrator'}
            </Content>
            <Content component="dt">Last updated</Content>
            <Content component="dd" data-testid="about-last-update">
              {subStatus?.lastUpdated
                ? new Date(subStatus.lastUpdated).toLocaleString(undefined, {
                    dateStyle: 'long',
                  })
                : 'Unknown'}
            </Content>
          </Content>
        </div>
        {error ? (
          <Alert
            style={{ marginTop: 'var(--pf-t--global--spacer--lg)' }}
            variant="danger"
            title="Problem loading product information"
          >
            {error.message}
          </Alert>
        ) : null}
      </Content>
    </AboutModal>
  );
};

export default AboutDialog;
