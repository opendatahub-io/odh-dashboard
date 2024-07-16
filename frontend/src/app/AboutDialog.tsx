import React from 'react';
import {
  AboutModal,
  Alert,
  Bullseye,
  Spinner,
  TextContent,
  TextList,
  TextListItem,
} from '@patternfly/react-core';
import { ODH_LOGO, ODH_PRODUCT_NAME } from '~/utilities/const';
import { useUser, useClusterInfo } from '~/redux/selectors';
import { useAppContext } from '~/app/AppContext';
import useFetchDsciStatus from '~/concepts/areas/useFetchDsciStatus';
import { useWatchOperatorSubscriptionStatus } from '~/utilities/useWatchOperatorSubscriptionStatus';

import './AboutDialog.scss';

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
      brandImageSrc={`${window.location.origin}/images/${ODH_LOGO}`}
      brandImageAlt={`${ODH_PRODUCT_NAME} logo`}
      productName={ODH_PRODUCT_NAME}
      aria-label={ODH_PRODUCT_NAME}
      data-testid="odh-about-dialog"
    >
      <TextContent style={{ paddingBottom: 48 }}>
        <h4>About</h4>
        <p data-testid="about-text">{isRHOAI ? RhoaiAboutText : OdhAboutText}</p>
      </TextContent>
      <TextContent>
        <div style={{ position: 'relative' }}>
          {loading ? (
            <Bullseye style={{ position: 'absolute', width: '100%' }}>
              <Spinner size="xl" />
            </Bullseye>
          ) : null}
          <TextList component="dl" style={{ visibility: loading ? 'hidden' : 'visible' }}>
            <TextListItem component="dt" data-testid="about-product-name">
              {dsciStatus?.release?.name ||
                (isRHOAI ? RhoaiDefaultReleaseName : OdhDefaultReleaseName)}{' '}
              version
            </TextListItem>
            <TextListItem component="dd" data-testid="about-version">
              {dsciStatus?.release?.version || 'Unknown'}
            </TextListItem>
            <TextListItem component="dt">Channel</TextListItem>
            <TextListItem component="dd" data-testid="about-channel">
              {subStatus?.channel || 'Unknown'}
            </TextListItem>
            <TextListItem component="dt">API server</TextListItem>
            <TextListItem component="dd" data-testid="about-server-url">
              {serverURL}
            </TextListItem>
            <TextListItem component="dt">User type</TextListItem>
            <TextListItem component="dd" data-testid="about-access-level">
              {isAdmin ? 'Administrator' : 'Non-administrator'}
            </TextListItem>
            <TextListItem component="dt">Last updated</TextListItem>
            <TextListItem component="dd" data-testid="about-last-update">
              {subStatus?.lastUpdated
                ? new Date(subStatus.lastUpdated).toLocaleString(undefined, {
                    dateStyle: 'long',
                  })
                : 'Unknown'}
            </TextListItem>
          </TextList>
        </div>
        {error ? (
          <Alert
            style={{ marginTop: 'var(--pf-v5-global--spacer--lg)' }}
            variant="danger"
            title="Problem loading product information"
          >
            {error.message}
          </Alert>
        ) : null}
      </TextContent>
    </AboutModal>
  );
};

export default AboutDialog;
