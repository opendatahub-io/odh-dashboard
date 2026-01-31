/**
 * Message type used for cross-frame communication between the MLflow iframe and the parent window.
 */
export const MLFLOW_NAVIGATE_MESSAGE_TYPE = 'odh-mlflow-navigate';

/**
 * Script injected into the MLflow iframe to handle navigation events.
 * When clicking MLflow's 404 "home page" link, sends a postMessage to the parent
 * window so we can use React Router for smooth SPA navigation.
 */
export const MLFLOW_IFRAME_SCRIPTS = `
  document.addEventListener('click', function(e) {
    var link = e.target.closest && e.target.closest('a[data-testid="error-view-link"]');
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      window.top.postMessage({ type: '${MLFLOW_NAVIGATE_MESSAGE_TYPE}', path: '/' }, '*');
    }
  }, true);
`;
