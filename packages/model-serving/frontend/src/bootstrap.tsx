import * as React from 'react';
import ReactDOM from 'react-dom/client';
import { StandaloneDevPage, StandaloneHostApiProvider } from '~/app/StandaloneDevPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <StandaloneHostApiProvider>
      <StandaloneDevPage />
    </StandaloneHostApiProvider>
  </React.StrictMode>,
);
