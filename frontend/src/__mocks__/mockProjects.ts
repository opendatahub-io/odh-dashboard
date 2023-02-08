export const mockProjects = {
    "kind": "ProjectList",
    "apiVersion": "project.openshift.io/v1",
    "metadata": {},
    "items": [
        {
            "metadata": {
                "name": "project",
                "uid": "4e672dd8-55cc-44b8-973c-d2a05ed41fae",
                "resourceVersion": "4789290",
                "creationTimestamp": "2023-02-14T21:43:59Z",
                "labels": {
                    "kubernetes.io/metadata.name": "project",
                    "modelmesh-enabled": "true",
                    "opendatahub.io/dashboard": "true",
                    "pod-security.kubernetes.io/audit": "restricted",
                    "pod-security.kubernetes.io/audit-version": "v1.24",
                    "pod-security.kubernetes.io/warn": "restricted",
                    "pod-security.kubernetes.io/warn-version": "v1.24"
                },
                "annotations": {
                    "openshift.io/description": "",
                    "openshift.io/display-name": "project",
                    "openshift.io/requester": "admin",
                    "openshift.io/sa.scc.mcs": "s0:c26,c25",
                    "openshift.io/sa.scc.supplemental-groups": "1000700000/10000",
                    "openshift.io/sa.scc.uid-range": "1000700000/10000"
                },
                "managedFields": [
                    {
                        "manager": "openshift-apiserver",
                        "operation": "Update",
                        "apiVersion": "v1",
                        "time": "2023-02-14T21:43:59Z",
                        "fieldsType": "FieldsV1",
                        "fieldsV1": {
                            "f:metadata": {
                                "f:annotations": {
                                    ".": {},
                                    "f:openshift.io/description": {},
                                    "f:openshift.io/display-name": {},
                                    "f:openshift.io/requester": {}
                                },
                                "f:labels": {
                                    ".": {},
                                    "f:kubernetes.io/metadata.name": {}
                                }
                            }
                        }
                    },
                    {
                        "manager": "openshift-controller-manager",
                        "operation": "Update",
                        "apiVersion": "v1",
                        "time": "2023-02-14T21:43:59Z",
                        "fieldsType": "FieldsV1",
                        "fieldsV1": {
                            "f:spec": {
                                "f:finalizers": {}
                            }
                        },
                        "subresource": "finalize"
                    },
                    {
                        "manager": "cluster-policy-controller",
                        "operation": "Update",
                        "apiVersion": "v1",
                        "time": "2023-02-14T21:44:00Z",
                        "fieldsType": "FieldsV1",
                        "fieldsV1": {
                            "f:metadata": {
                                "f:annotations": {
                                    "f:openshift.io/sa.scc.mcs": {},
                                    "f:openshift.io/sa.scc.supplemental-groups": {},
                                    "f:openshift.io/sa.scc.uid-range": {}
                                },
                                "f:labels": {
                                    "f:pod-security.kubernetes.io/audit": {},
                                    "f:pod-security.kubernetes.io/audit-version": {},
                                    "f:pod-security.kubernetes.io/warn": {},
                                    "f:pod-security.kubernetes.io/warn-version": {}
                                }
                            }
                        }
                    },
                    {
                        "manager": "unknown",
                        "operation": "Update",
                        "apiVersion": "v1",
                        "time": "2023-02-14T21:44:00Z",
                        "fieldsType": "FieldsV1",
                        "fieldsV1": {
                            "f:metadata": {
                                "f:labels": {
                                    "f:modelmesh-enabled": {},
                                    "f:opendatahub.io/dashboard": {}
                                }
                            }
                        }
                    }
                ]
            },
            "spec": {
                "finalizers": [
                    "kubernetes"
                ]
            },
            "status": {
                "phase": "Active"
            }
        }
    ]
}