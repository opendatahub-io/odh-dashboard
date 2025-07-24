# Running Language Model Evaluation (LM-Eval) with Open Data Hub (ODH) Integration

This guide outlines how to run the upstream LM-Eval micro-frontend and integrate it with a local Open Data Hub (ODH) development environment.

## Prerequisites

1.  **Start the ODH Backend:**
    Ensure your ODH backend server is running. Navigate to the `backend` directory within your main Open Data Hub dashboard project and run:

    ```bash
    npm run start:dev
    ```

2.  **Start the ODH Frontend:**
    The main ODH dashboard frontend application must also be running. Navigate to the main Open Data Hub dashboard project root and run:
    ```bash
    npm run start:dev
    ```
    **Important:** Do not use `npm run start:dev:ext` for the ODH frontend when testing this upstream integration.

## ODH Integration Point

The integration of this upstream LM-Eval with Open Data Hub is managed via plugin extensions. The primary extension definitions for this integration can be found in:
[./upstream/frontend/odh/extensions.ts](./upstream/frontend/odh/extensions.ts)

This file declares how the LM-Eval UI components and routes are exposed to and loaded by the ODH dashboard.

## Testing the Integration

1. **Build the Micro-Frontend:**
   In a new terminal, navigate into [./upstream/frontend], run `npm install`.

   Then run `npm run start:dev`

2. **Start the LM Eval BFF:**

   In a new terminal, navigate into [./upstream/bff].

   Then run `go run ./cmd --auth-method=mock --allowed-origins=http://localhost:4010,http://localhost:9000`

   This would run the bff in mock mode and can be used for development.

   More ways to run the bff can be found here : [./upstream/bff/API_ENDPOINTS.md].

3. **Verify Integration:**
   - Look for "Model Evaluations MF" in the navigation under "Models" section
   - Navigate to `model-evaluations` to access the LM-Eval interface
   - Check browser console for any module federation errors

## Module Federation Configuration

The micro-frontend is configured to expose its extensions through module federation in:
[./upstream/frontend/config/moduleFederation.js](./upstream/frontend/config/moduleFederation.js)

This configuration defines how the LM-Eval components are shared and loaded by the main ODH dashboard.
