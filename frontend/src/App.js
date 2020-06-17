import React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import {
  Page,
} from '@patternfly/react-core';
import Launcher from './Launcher/Launcher.js'
import Header from './Header.js'

  /**
   * This function wraps up the output from Launcher.js into a React Fragment and returns to the index page
   */
function App() {
  return (
    <React.Fragment>
    <Page
          header={Header}
        >
    <Launcher />      
    </Page>
    </React.Fragment>
      )}

export default App;
