import React from "react"
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { store } from '../src/redux/store/store';
import SDKInitialize from '../src/SDKInitialize';
import { BrowserStorageContextProvider } from '../src/components/browserStorage/BrowserStorageContext';
import { initialize, mswDecorator } from 'msw-storybook-addon';

import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
import { AppContext } from "../src/app/AppContext";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

// Initialize MSW
initialize();

export const decorators = [
  (Story) => (
    <AppContext.Provider
      value={{
        dashboardConfig: {
          "apiVersion": "opendatahub.io/v1alpha",
          "kind": "OdhDashboardConfig",
          "metadata": {
            "name": "odh-dashboard-config",
            "labels": {
              "opendatahub.io/dashboard": "true"
            },
            "annotations": {
              "kubectl.kubernetes.io/last-applied-configuration": "{\"apiVersion\":\"opendatahub.io/v1alpha\",\"kind\":\"OdhDashboardConfig\",\"metadata\":{\"annotations\":{},\"creationTimestamp\":null,\"name\":\"odh-dashboard-config\",\"namespace\":\"redhat-ods-applications\"},\"spec\":{\"dashboardConfig\":{\"disableBYONImageStream\":false,\"disableClusterManager\":false,\"disableISVBadges\":false,\"disableInfo\":false,\"disableModelServing\":false,\"disableProjects\":false,\"disableSupport\":false,\"disableTracking\":false,\"enablement\":true},\"groupsConfig\":{\"adminGroups\":\"rhods-admins\",\"allowedGroups\":\"system:authenticated\"},\"modelServerSizes\":[{\"name\":\"Small\",\"resources\":{\"limits\":{\"cpu\":\"2\",\"memory\":\"8Gi\"},\"requests\":{\"cpu\":\"1\",\"memory\":\"4Gi\"}}},{\"name\":\"Medium\",\"resources\":{\"limits\":{\"cpu\":\"8\",\"memory\":\"10Gi\"},\"requests\":{\"cpu\":\"4\",\"memory\":\"8Gi\"}}},{\"name\":\"Large\",\"resources\":{\"limits\":{\"cpu\":\"10\",\"memory\":\"20Gi\"},\"requests\":{\"cpu\":\"6\",\"memory\":\"16Gi\"}}}],\"notebookController\":{\"enabled\":true,\"notebookNamespace\":\"rhods-notebooks\",\"pvcSize\":\"20Gi\"},\"notebookSizes\":[{\"name\":\"Small\",\"resources\":{\"limits\":{\"cpu\":\"2\",\"memory\":\"8Gi\"},\"requests\":{\"cpu\":\"1\",\"memory\":\"8Gi\"}}},{\"name\":\"Medium\",\"resources\":{\"limits\":{\"cpu\":\"6\",\"memory\":\"24Gi\"},\"requests\":{\"cpu\":\"3\",\"memory\":\"24Gi\"}}},{\"name\":\"Large\",\"resources\":{\"limits\":{\"cpu\":\"14\",\"memory\":\"56Gi\"},\"requests\":{\"cpu\":\"7\",\"memory\":\"56Gi\"}}},{\"name\":\"X Large\",\"resources\":{\"limits\":{\"cpu\":\"30\",\"memory\":\"120Gi\"},\"requests\":{\"cpu\":\"15\",\"memory\":\"120Gi\"}}}]}}\n"
            },
            "creationTimestamp": "2023-02-08T13:35:42Z",
            "generation": 15,
            "managedFields": [
              {
                "apiVersion": "opendatahub.io/v1alpha",
                "fieldsType": "FieldsV1",
                "fieldsV1": {
                  "f:metadata": {
                    "f:annotations": {
                      ".": {},
                      "f:kubectl.kubernetes.io/last-applied-configuration": {}
                    }
                  },
                  "f:spec": {
                    ".": {},
                    "f:dashboardConfig": {
                      ".": {},
                      "f:disableBYONImageStream": {},
                      "f:disableClusterManager": {},
                      "f:disableISVBadges": {},
                      "f:disableInfo": {},
                      "f:disableModelServing": {},
                      "f:disableProjects": {},
                      "f:disableSupport": {},
                      "f:enablement": {}
                    },
                    "f:groupsConfig": {
                      ".": {},
                      "f:adminGroups": {},
                      "f:allowedGroups": {}
                    },
                    "f:modelServerSizes": {},
                    "f:notebookController": {
                      ".": {},
                      "f:enabled": {},
                      "f:notebookNamespace": {},
                      "f:pvcSize": {}
                    },
                    "f:notebookSizes": {}
                  }
                },
                "manager": "kubectl-client-side-apply",
                "operation": "Update",
                "time": "2023-02-08T13:35:42Z"
              },
              {
                "apiVersion": "opendatahub.io/v1alpha",
                "fieldsType": "FieldsV1",
                "fieldsV1": {
                  "f:spec": {
                    "f:dashboardConfig": {
                      "f:disableTracking": {}
                    }
                  }
                },
                "manager": "Mozilla",
                "operation": "Update",
                "time": "2023-02-10T14:14:35Z"
              },
              {
                "apiVersion": "opendatahub.io/v1alpha",
                "fieldsType": "FieldsV1",
                "fieldsV1": {
                  "f:spec": {
                    "f:dashboardConfig": {
                      "f:disableUserManagement": {}
                    },
                    "f:notebookController": {
                      "f:notebookTolerationSettings": {
                        ".": {},
                        "f:enabled": {},
                        "f:key": {}
                      }
                    }
                  }
                },
                "manager": "unknown",
                "operation": "Update",
                "time": "2023-02-10T16:38:44Z"
              }
            ],
            "namespace": "redhat-ods-applications",
            "resourceVersion": "1926467",
            "uid": "1e4fb39d-1d61-45c6-93ff-f4872a838a68"
          },
          "spec": {
            "dashboardConfig": {
              "enablement": true,
              "disableInfo": false,
              "disableSupport": false,
              "disableClusterManager": false,
              "disableTracking": true,
              "disableBYONImageStream": false,
              "disableISVBadges": false,
              "disableAppLauncher": false,
              "disableUserManagement": false,
              "disableProjects": false,
              "disableModelServing": false
            },
            "notebookController": {
              "enabled": true,
              "notebookNamespace": "rhods-notebooks",
              "notebookTolerationSettings": {
                "enabled": true,
                "key": "NotebooksOnlyChange"
              },
              "pvcSize": "20Gi"
            },
            "groupsConfig": {
              "adminGroups": "rhods-admins",
              "allowedGroups": "system:authenticated"
            },
            "modelServerSizes": [
              {
                "name": "Small",
                "resources": {
                  "limits": {
                    "cpu": "2",
                    "memory": "8Gi"
                  },
                  "requests": {
                    "cpu": "1",
                    "memory": "4Gi"
                  }
                }
              },
              {
                "name": "Medium",
                "resources": {
                  "limits": {
                    "cpu": "8",
                    "memory": "10Gi"
                  },
                  "requests": {
                    "cpu": "4",
                    "memory": "8Gi"
                  }
                }
              },
              {
                "name": "Large",
                "resources": {
                  "limits": {
                    "cpu": "10",
                    "memory": "20Gi"
                  },
                  "requests": {
                    "cpu": "6",
                    "memory": "16Gi"
                  }
                }
              }
            ],
            "notebookSizes": [
              {
                "name": "Small",
                "resources": {
                  "limits": {
                    "cpu": "2",
                    "memory": "8Gi"
                  },
                  "requests": {
                    "cpu": "1",
                    "memory": "8Gi"
                  }
                }
              },
              {
                "name": "Medium",
                "resources": {
                  "limits": {
                    "cpu": "6",
                    "memory": "24Gi"
                  },
                  "requests": {
                    "cpu": "3",
                    "memory": "24Gi"
                  }
                }
              },
              {
                "name": "Large",
                "resources": {
                  "limits": {
                    "cpu": "14",
                    "memory": "56Gi"
                  },
                  "requests": {
                    "cpu": "7",
                    "memory": "56Gi"
                  }
                }
              },
              {
                "name": "X Large",
                "resources": {
                  "limits": {
                    "cpu": "30",
                    "memory": "120Gi"
                  },
                  "requests": {
                    "cpu": "15",
                    "memory": "120Gi"
                  }
                }
              }
            ]
          }
        },
      }}
    >
      <Provider store={store}>
        <Router>
          <SDKInitialize>
            <BrowserStorageContextProvider>
              <Story />
            </BrowserStorageContextProvider>
          </SDKInitialize>
        </Router>
      </Provider>
    </AppContext.Provider>
  ),
  mswDecorator
];