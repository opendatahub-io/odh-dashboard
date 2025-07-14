import * as React from 'react';
import { Content } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import jupyterImg from '#~/images/jupyter.svg';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { useCheckJupyterEnabled } from '#~/utilities/notebookControllerUtils';
import HomeHint from './HomeHint';

const LandingPageHomeHint: React.FC = () => (
  <HomeHint
    title={<>Looking for the previous landing page?</>}
    body={
      <Content component="p" data-testid="hint-body-text">
        {ODH_PRODUCT_NAME} has a new landing page. You can access applications that are enabled for
        your organization, such as Jupyter, from the{' '}
        <Link to="/enabled" data-testid="home-page-hint-navigate">
          Enabled applications
        </Link>{' '}
        page.
      </Content>
    }
    isDisplayed={useCheckJupyterEnabled()}
    homeHintKey="new-landing-page-intro"
    image={
      <img
        data-testid="jupyter-hint-icon"
        src={jupyterImg}
        alt="Jupyter"
        style={{
          height: 42,
          maxWidth: 'unset',
          backgroundColor: 'var(--pf-t--color--white)',
          padding: 'var(--pf-t--global--spacer--xs)',
          borderRadius: 'var(--pf-t--global--border--radius--small)',
        }}
      />
    }
  />
);

export default LandingPageHomeHint;
