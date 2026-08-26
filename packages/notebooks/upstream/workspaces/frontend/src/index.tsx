import('./bootstrap').catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Application failed to start:', err);
  const root = document.getElementById('root');
  if (root) {
    root.textContent =
      'Unable to load the application. Please refresh the page or contact support.';
  }
});
