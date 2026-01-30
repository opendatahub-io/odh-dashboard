import React, { useRef, useEffect } from 'react';
import { MLFLOW_IFRAME_STYLES } from './MLflowIframeStyles';

interface MLflowIframeCSSOverrideProps {
  children: (iframeRef: React.RefObject<HTMLIFrameElement>) => React.ReactNode;
}

const MLflowIframeCSSOverride: React.FC<MLflowIframeCSSOverrideProps> = ({ children }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleIframeLoad = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe?.contentDocument) {
          const doc = iframe.contentDocument;

          const style = doc.createElement('style');
          style.textContent = MLFLOW_IFRAME_STYLES;
          doc.head.appendChild(style);
        }
      } catch (error) {
        console.warn('Error accessing iframe content:', error);
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      return () => {
        iframe.removeEventListener('load', handleIframeLoad);
      };
    }
    return undefined;
  }, []);

  return children(iframeRef);
};

export default MLflowIframeCSSOverride;
