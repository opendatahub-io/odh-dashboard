# Environment Variables

The following environment variables are used to configure the deployment and development environment for the AutoML UI. These variables should be defined in a `.env.local` file in the `packages/automl/frontend` directory of the project. **These values will affect the build and push commands**.

- `LOGO=logo-light-theme.svg`
  - The file name for the logo used in the light theme.
- `LOGO_DARK=logo-dark-theme.svg`
  - The file name for the logo used in the dark theme.
- `FAVICON=favicon.ico`
  - The file name for the favicon of the application.
- `PRODUCT_NAME="AutoML"`
  - The name of the product displayed in the UI.
- `KUBEFLOW_USERNAME="user@example.com"`
  - The default username for the application. **DO NOT CHANGE THIS IF BFF IS SET IN MOCK MODE**.
- `COMPANY_URI="oci://kubeflow.io"`
  - The company URI used for the application.
