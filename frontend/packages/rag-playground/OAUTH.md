# OAuth Configuration Guide for rag-playground

This guide explains how to configure OAuth authentication for the `rag-playground` application on OpenShift, including how to set the required environment variables and obtain the OAuth server URL.

## 1. Prerequisites
- Access to an OpenShift cluster with `oc` CLI installed
- Sufficient permissions to create OAuth clients and view routes
- The application route name: `rag-playground`

For instructions on setting up the application on OpenShift, see [OPENSHIFT.md](OPENSHIFT.md).

## 2. Obtain the OAuth Server URL
The OAuth server URL is required for the application to communicate with OpenShift's authentication system. To get the OAuth server URL, run:

```sh
OAUTH_DOMAIN=$(oc get ingresses.config cluster -o jsonpath='{.spec.domain}' | cut -f3- -d.)
OAUTH_SERVER_URL=https://oauth.${OAUTH_DOMAIN}
```


## 3. Create an OAuth Client in OpenShift
Create an OAuth client for your app. Assuming the route name of your application is `rag-playground`

+**Security Note:** Store the client secret securely and avoid exposing it in shell history or logs. Consider using OpenShift Secrets or other secure secret management solutions for production deployments.

```sh
CLIENT_SECRET=your-client-secret
APP_URL=https://$(oc get route rag-playground -ojsonpath={.spec.host})
APP_CALLBACK_URL=${APP_URL}/oauth/callback
oc apply -f - <<EOF
apiVersion: oauth.openshift.io/v1
kind: OAuthClient
metadata:
  name: rag-playground
secret: ${CLIENT_SECRET}
redirectURIs:
  - ${APP_CALLBACK_URL}
grantMethod: auto
EOF

## Get the client secret:

```sh
oc get oauthclient rag-playground -o jsonpath='{.secret}'
```

## 4. Set Environment Variables
Set the following environment variables for your deployment (e.g., in your OpenShift Deployment, DeploymentConfig, or as parameters to your Helm chart):

| Variable                   | Description                                      | Example Value |
|----------------------------|--------------------------------------------------|---------------|
| `OAUTH_ENABLED`            | Enable OAuth authentication                      | `true`        |
| `OAUTH_CLIENT_ID`          | OAuth client ID (should match your app route)    | `rag-playground` |
| `OAUTH_CLIENT_SECRET`      | OAuth client secret from previous step           | `your-client-secret` |
| `OAUTH_REDIRECT_URI`       | Redirect URI for OAuth callback                  | `https://rag-playground.apps.example.com/oauth/callback` |
| `OAUTH_SERVER_URL`         | OAuth server URL (see step 2)                    | `https://oauth-openshift.apps.example.com` |
| `OPENSHIFT_API_SERVER_URL` | OpenShift API Server URL                         | `https://api.example.com:6443` |
Example using `oc set env`:

```sh
oc set env deployment/rag-playground \
  OAUTH_ENABLED=true \
  OAUTH_CLIENT_ID=rag-playground \
  OAUTH_CLIENT_SECRET=${CLIENT_SECRET} \
  OAUTH_REDIRECT_URI=${APP_CALLBACK_URL} \
  OAUTH_SERVER_URL=${OAUTH_SERVER_URL} \
  OPENSHIFT_API_SERVER_URL=$(oc whoami --show-server)
```

## 5. Deploy or Restart the Application
After setting the environment variables, (re)deploy your application to apply the changes.

## 6. Login Flow
- When users access the app, they will be redirected to OpenShift's login page.
- After successful login, they will be redirected back to `/oauth/callback` on your app, and the app will handle the token exchange automatically.

---
For more details, see the main `README.md` or contact your OpenShift administrator. 
