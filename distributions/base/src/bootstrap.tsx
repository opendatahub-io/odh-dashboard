import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';
import { ExtensibilityContextProvider } from './plugins/ExtensibilityContext';
import Shell from './Shell';
import ShellHeader from './ShellHeader';
import ShellNav from './ShellNav';
import ShellRoutes from './ShellRoutes';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <ExtensibilityContextProvider>
            <Shell masthead={<ShellHeader />} sidebar={<ShellNav />}>
              <ShellRoutes />
            </Shell>
          </ExtensibilityContextProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
