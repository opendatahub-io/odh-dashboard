import React, { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MLFLOW_IFRAME_SCRIPTS, MLFLOW_NAVIGATE_MESSAGE_TYPE } from './MLflowIframeScripts';
import { MLFLOW_IFRAME_STYLES } from './MLflowIframeStyles';

interface MLflowIframeCSSOverrideProps {
  children: (iframeRef: React.RefObject<HTMLIFrameElement>) => React.ReactNode;
}

/**
 * Wrapper component that injects CSS and script overrides into the MLflow iframe.
 * - Injects CSS to style the iframe content to match the dashboard
 * - Injects scripts to handle navigation events via postMessage
 */
const MLflowIframeCSSOverride: React.FC<MLflowIframeCSSOverrideProps> = ({ children }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();

  // Listen for navigation messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === MLFLOW_NAVIGATE_MESSAGE_TYPE && event.data?.path) {
        navigate(event.data.path);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  // Inject styles and scripts into iframe on load
  const injectOverrides = useCallback((doc: Document) => {
    const style = doc.createElement('style');
    style.textContent = MLFLOW_IFRAME_STYLES;
    doc.head.appendChild(style);

    const script = doc.createElement('script');
    script.textContent = MLFLOW_IFRAME_SCRIPTS;
    doc.head.appendChild(script);
  }, []);

  useEffect(() => {
    const handleIframeLoad = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe?.contentDocument?.head) {
          injectOverrides(iframe.contentDocument);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Error accessing iframe content:', error);
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
    }
    return () => {
      iframe?.removeEventListener('load', handleIframeLoad);
    };
  }, [injectOverrides]);

  return children(iframeRef);
};

export default MLflowIframeCSSOverride;
