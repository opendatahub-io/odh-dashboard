import('./bootstrap').catch((error) => {
  console.error('Failed to load application:', error);
  const root = document.getElementById('root');
  if (root) {
    root.textContent = 'Failed to load application. Please refresh the page.';
    root.style.padding = '2rem';
  }
});
