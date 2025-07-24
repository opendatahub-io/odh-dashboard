import { Spinner } from '@patternfly/react-core';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '@app/services/authService';

const OAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const savedState = localStorage.getItem('oauth_state');

      // Clear the saved state
      localStorage.removeItem('oauth_state');

      if (!code) {
        setError('No authorization code received');
        return;
      }

      if (state !== savedState) {
        setError('Invalid state parameter');
        return;
      }

      try {
        await authService.handleCallback(code, state || undefined);
        window.location.href = '/';
      } catch (err) {
        setError('Failed to authenticate');
        // eslint-disable-next-line no-console
        console.error('Authentication error:', err);
      }
    };

    handleCallback();
  }, [location, navigate]);

  if (error) {
    return (
      <div className="pf-u-text-align-center pf-u-mt-xl">
        <h2>Authentication Error</h2>
        <p className="pf-u-color-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="pf-u-text-align-center pf-u-mt-xl">
      <Spinner />
      <p className="pf-u-mt-md">Authenticating...</p>
    </div>
  );
};

export default OAuthCallback;
