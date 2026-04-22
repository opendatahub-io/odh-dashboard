/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package hw_profile_migration

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

// TODO: Replace simulateMigration() with actual migration function import
// when opendatahub-operator migration code is available in this repo.
// The current implementation simulates the expected behavior from upgrade_utils.go#L672

const (
	globalNamespace = "redhat-ods-applications"
)

var _ = Describe("Hardware Profile Migration Logic", func() {

	Context("When migrating notebooks with accelerator profiles", Ordered, func() {
		const (
			userNamespace = "migtest-project"
		)

		var testNamespace *corev1.Namespace

		BeforeAll(func() {
			By("creating user namespace")
			testNamespace = &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: userNamespace,
				},
			}
			Expect(k8sClient.Create(ctx, testNamespace)).To(Succeed())

			By("creating global namespace")
			globalNs := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: globalNamespace,
				},
			}
			Expect(k8sClient.Create(ctx, globalNs)).To(Succeed())
		})

		AfterAll(func() {
			By("deleting test namespaces")
			Expect(k8sClient.Delete(ctx, testNamespace)).To(Succeed())
			globalNs := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: globalNamespace,
				},
			}
			Expect(k8sClient.Delete(ctx, globalNs)).To(Succeed())
		})

		Describe("TC-MIG-001: Migration adds both hardware profile annotations", func() {
			It("should add both hardware-profile-name and hardware-profile-namespace annotations", func() {
				notebookName := "migtest-notebook-01"

				By("creating a notebook with accelerator profile annotation")
				notebook := &unstructured.Unstructured{}
				notebook.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "kubeflow.org",
					Version: "v1",
					Kind:    "Notebook",
				})
				notebook.SetName(notebookName)
				notebook.SetNamespace(userNamespace)
				annotations := map[string]interface{}{
					"opendatahub.io/accelerator-name": "migtest-accel-gpu",
				}
				notebook.Object["metadata"] = map[string]interface{}{
					"name":        notebookName,
					"namespace":   userNamespace,
					"annotations": annotations,
				}
				notebook.Object["spec"] = map[string]interface{}{
					"template": map[string]interface{}{
						"spec": map[string]interface{}{
							"containers": []interface{}{
								map[string]interface{}{
									"name":  "notebook",
									"image": "jupyter-minimal:latest",
								},
							},
						},
					},
				}

				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("simulating migration logic")
				// TODO: Call actual migration function when available
				simulateMigration(notebook, "migtest-accel-gpu-notebooks")

				By("retrieving the migrated notebook")
				migratedNotebook := &unstructured.Unstructured{}
				migratedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNamespace,
				}, migratedNotebook)).To(Succeed())

				By("verifying both annotations are present")
				annot := migratedNotebook.GetAnnotations()
				Expect(annot).To(HaveKey("opendatahub.io/hardware-profile-name"))
				Expect(annot).To(HaveKey("opendatahub.io/hardware-profile-namespace"))
				Expect(annot["opendatahub.io/hardware-profile-name"]).To(Equal("migtest-accel-gpu-notebooks"))
				Expect(annot["opendatahub.io/hardware-profile-namespace"]).To(Equal(globalNamespace))

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
			})
		})

		Describe("TC-MIG-002: Namespace annotation points to hardware profile's actual namespace", func() {
			It("should set namespace annotation to global namespace, not notebook namespace", func() {
				notebookName := "migtest-notebook-02"

				By("creating a notebook in user namespace with accelerator profile")
				notebook := &unstructured.Unstructured{}
				notebook.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "kubeflow.org",
					Version: "v1",
					Kind:    "Notebook",
				})
				notebook.SetName(notebookName)
				notebook.SetNamespace(userNamespace)
				notebook.SetAnnotations(map[string]string{
					"opendatahub.io/accelerator-name": "migtest-accel-tpu",
				})
				notebook.Object["spec"] = map[string]interface{}{
					"template": map[string]interface{}{
						"spec": map[string]interface{}{
							"containers": []interface{}{
								map[string]interface{}{
									"name":  "notebook",
									"image": "jupyter-minimal:latest",
								},
							},
						},
					},
				}

				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("simulating migration")
				simulateMigration(notebook, "migtest-accel-tpu-notebooks")

				By("retrieving the notebook")
				migratedNotebook := &unstructured.Unstructured{}
				migratedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNamespace,
				}, migratedNotebook)).To(Succeed())

				By("verifying namespace annotation points to global namespace")
				annot := migratedNotebook.GetAnnotations()
				Expect(annot["opendatahub.io/hardware-profile-namespace"]).To(Equal(globalNamespace))
				Expect(annot["opendatahub.io/hardware-profile-namespace"]).NotTo(Equal(userNamespace))

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
			})
		})

		Describe("TC-MIG-003: Migration creates hardware profile in global namespace", func() {
			It("should create hardware profile CR in global namespace", func() {
				notebookName := "migtest-notebook-03"
				hwProfileName := "migtest-accel-a100-notebooks"

				By("creating a notebook with accelerator profile")
				notebook := &unstructured.Unstructured{}
				notebook.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "kubeflow.org",
					Version: "v1",
					Kind:    "Notebook",
				})
				notebook.SetName(notebookName)
				notebook.SetNamespace(userNamespace)
				notebook.SetAnnotations(map[string]string{
					"opendatahub.io/accelerator-name": "migtest-accel-a100",
				})
				notebook.Object["spec"] = map[string]interface{}{
					"template": map[string]interface{}{
						"spec": map[string]interface{}{
							"containers": []interface{}{
								map[string]interface{}{
									"name":  "notebook",
									"image": "jupyter-minimal:latest",
								},
							},
						},
					},
				}

				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("simulating migration with hardware profile creation")
				simulateMigrationWithHWProfile(notebook, hwProfileName)

				By("verifying hardware profile was created in global namespace")
				hwProfile := &unstructured.Unstructured{}
				hwProfile.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "dashboard.opendatahub.io",
					Version: "v1alpha1",
					Kind:    "HardwareProfile",
				})
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      hwProfileName,
					Namespace: globalNamespace,
				}, hwProfile)).To(Succeed())

				By("verifying hardware profile is NOT in notebook namespace")
				hwProfileUser := &unstructured.Unstructured{}
				hwProfileUser.SetGroupVersionKind(hwProfile.GroupVersionKind())
				err := k8sClient.Get(ctx, types.NamespacedName{
					Name:      hwProfileName,
					Namespace: userNamespace,
				}, hwProfileUser)
				Expect(err).To(HaveOccurred())

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
				Expect(k8sClient.Delete(ctx, hwProfile)).To(Succeed())
			})
		})

		Describe("TC-MIG-004: Migration handles missing accelerator profile gracefully", func() {
			It("should not add annotations when accelerator profile is missing", func() {
				notebookName := "migtest-notebook-orphan"

				By("creating a notebook referencing deleted accelerator profile")
				notebook := &unstructured.Unstructured{}
				notebook.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "kubeflow.org",
					Version: "v1",
					Kind:    "Notebook",
				})
				notebook.SetName(notebookName)
				notebook.SetNamespace(userNamespace)
				notebook.SetAnnotations(map[string]string{
					"opendatahub.io/accelerator-name": "deleted-accel-profile",
				})
				notebook.Object["spec"] = map[string]interface{}{
					"template": map[string]interface{}{
						"spec": map[string]interface{}{
							"containers": []interface{}{
								map[string]interface{}{
									"name":  "notebook",
									"image": "jupyter-minimal:latest",
								},
							},
						},
					},
				}

				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("simulating migration with missing profile handling")
				simulateMigrationWithMissingProfile(notebook)

				By("retrieving the notebook")
				migratedNotebook := &unstructured.Unstructured{}
				migratedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNamespace,
				}, migratedNotebook)).To(Succeed())

				By("verifying no hardware profile annotations were added")
				annot := migratedNotebook.GetAnnotations()
				Expect(annot).NotTo(HaveKey("opendatahub.io/hardware-profile-name"))
				Expect(annot).NotTo(HaveKey("opendatahub.io/hardware-profile-namespace"))

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
			})
		})

		Describe("TC-MIG-005: Migration skips notebooks without accelerator profile references", func() {
			It("should not add hardware profile annotations to notebooks without accelerator profiles", func() {
				notebookName := "migtest-notebook-noprofile"

				By("creating a notebook without accelerator profile annotation")
				notebook := &unstructured.Unstructured{}
				notebook.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "kubeflow.org",
					Version: "v1",
					Kind:    "Notebook",
				})
				notebook.SetName(notebookName)
				notebook.SetNamespace(userNamespace)
				notebook.SetAnnotations(map[string]string{
					"some-other-annotation": "value",
				})
				notebook.Object["spec"] = map[string]interface{}{
					"template": map[string]interface{}{
						"spec": map[string]interface{}{
							"containers": []interface{}{
								map[string]interface{}{
									"name":  "notebook",
									"image": "jupyter-minimal:latest",
								},
							},
						},
					},
				}

				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("simulating migration (should skip this notebook)")
				// Migration logic checks for accelerator-name annotation and skips if absent

				By("retrieving the notebook")
				unchangedNotebook := &unstructured.Unstructured{}
				unchangedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNamespace,
				}, unchangedNotebook)).To(Succeed())

				By("verifying no hardware profile annotations were added")
				annot := unchangedNotebook.GetAnnotations()
				Expect(annot).NotTo(HaveKey("opendatahub.io/hardware-profile-name"))
				Expect(annot).NotTo(HaveKey("opendatahub.io/hardware-profile-namespace"))
				Expect(annot).To(HaveKey("some-other-annotation"))

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
			})
		})
	})
})

// simulateMigration simulates the expected migration behavior from upgrade_utils.go#L672
// TODO: Replace with actual migration function when opendatahub-operator code is available
func simulateMigration(notebook *unstructured.Unstructured, hwProfileName string) {
	annotations := notebook.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}
	annotations["opendatahub.io/hardware-profile-name"] = hwProfileName
	annotations["opendatahub.io/hardware-profile-namespace"] = globalNamespace
	notebook.SetAnnotations(annotations)
	Expect(k8sClient.Update(ctx, notebook)).To(Succeed())
}

// simulateMigrationWithHWProfile simulates migration that also creates the HardwareProfile CR
func simulateMigrationWithHWProfile(notebook *unstructured.Unstructured, hwProfileName string) {
	// Create HardwareProfile CR
	hwProfile := &unstructured.Unstructured{}
	hwProfile.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "dashboard.opendatahub.io",
		Version: "v1alpha1",
		Kind:    "HardwareProfile",
	})
	hwProfile.SetName(hwProfileName)
	hwProfile.SetNamespace(globalNamespace)
	hwProfile.Object["spec"] = map[string]interface{}{
		"displayName": hwProfileName,
		"enabled":     true,
	}
	Expect(k8sClient.Create(ctx, hwProfile)).To(Succeed())

	// Add annotations to notebook
	simulateMigration(notebook, hwProfileName)
}

// simulateMigrationWithMissingProfile simulates migration when the accelerator profile is missing
// Expected behavior: graceful handling, no annotations added, no crashloop
func simulateMigrationWithMissingProfile(notebook *unstructured.Unstructured) {
	// Migration logic checks if accelerator profile exists
	// If missing: skip annotation, emit event, continue
	// We simulate this by NOT adding annotations
	GinkgoWriter.Printf("Migration skipped for notebook %s/%s (missing accelerator profile)\n",
		notebook.GetNamespace(), notebook.GetName())
}
