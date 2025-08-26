import { useEffect, useState, useCallback } from 'react';

const useFullscreenLogViewer = (): {
  isFullScreen: boolean;
  onExpandClick: () => void;
} => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleFullScreen = useCallback(() => {
    setIsFullScreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullScreen);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreen);
    };
  }, [handleFullScreen]);

  useEffect(() => {
    const logWindowElement = document.querySelector(
      '#dashboard-logviewer .pf-v6-c-log-viewer__main',
    );
    if (!logWindowElement) {
      return;
    }
    if (isFullScreen) {
      logWindowElement.setAttribute('data-test-full-screen', 'true');
    } else {
      logWindowElement.removeAttribute('data-test-full-screen');
    }
  }, [isFullScreen]);

  const onExpandClick = useCallback(() => {
    const element = document.querySelector('#dashboard-logviewer');

    if (!isFullScreen) {
      if (element?.requestFullscreen) {
        element.requestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  }, [isFullScreen]);

  return {
    isFullScreen,
    onExpandClick,
  };
};

export default useFullscreenLogViewer;
