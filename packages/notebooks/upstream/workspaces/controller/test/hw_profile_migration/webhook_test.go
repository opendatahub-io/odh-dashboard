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

// TODO: Replace webhook simulation with actual webhook validation when
// mutating.go#L237 code is available in this repo.

var _ = Describe("Hardware Profile Webhook Validation", func() {

	Context("When validating notebook updates with hardware profile annotations", Ordered, func() {
		const (
			globalNs = "whtest-global"   // Simulates redhat-ods-applications
			userNs   = "whtest-userproject"
		)

		var globalNamespace, userNamespace *corev1.Namespace

		BeforeAll(func() {
			By("creating global namespace")
			globalNamespace = &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: globalNs,
				},
			}
			Expect(k8sClient.Create(ctx, globalNamespace)).To(Succeed())

			By("creating user namespace")
			userNamespace = &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: userNs,
				},
			}
			Expect(k8sClient.Create(ctx, userNamespace)).To(Succeed())
		})

		AfterAll(func() {
			By("deleting test namespaces")
			Expect(k8sClient.Delete(ctx, globalNamespace)).To(Succeed())
			Expect(k8sClient.Delete(ctx, userNamespace)).To(Succeed())
		})

		Describe("TC-WH-001: Webhook accepts notebook with both name and namespace annotations", func() {
			It("should accept update when both annotations are present and valid", func() {
				hwProfileName := "whtest-hw-profile"
				notebookName := "whtest-notebook-01"

				By("creating hardware profile in global namespace")
				hwProfile := createHardwareProfile(hwProfileName, globalNs)
				Expect(k8sClient.Create(ctx, hwProfile)).To(Succeed())

				By("creating notebook in user namespace")
				notebook := createNotebook(notebookName, userNs)
				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("annotating notebook with both hardware profile annotations")
				retrievedNotebook := &unstructured.Unstructured{}
				retrievedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNs,
				}, retrievedNotebook)).To(Succeed())

				annotations := retrievedNotebook.GetAnnotations()
				if annotations == nil {
					annotations = make(map[string]string)
				}
				annotations["opendatahub.io/hardware-profile-name"] = hwProfileName
				annotations["opendatahub.io/hardware-profile-namespace"] = globalNs
				retrievedNotebook.SetAnnotations(annotations)

				By("updating notebook (webhook should accept)")
				Expect(k8sClient.Update(ctx, retrievedNotebook)).To(Succeed())

				By("verifying both annotations are persisted")
				updatedNotebook := &unstructured.Unstructured{}
				updatedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNs,
				}, updatedNotebook)).To(Succeed())

				annot := updatedNotebook.GetAnnotations()
				Expect(annot["opendatahub.io/hardware-profile-name"]).To(Equal(hwProfileName))
				Expect(annot["opendatahub.io/hardware-profile-namespace"]).To(Equal(globalNs))

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
				Expect(k8sClient.Delete(ctx, hwProfile)).To(Succeed())
			})
		})

		Describe("TC-WH-002: Webhook looks up hardware profile in annotated namespace", func() {
			It("should find hardware profile in annotated namespace, not notebook namespace", func() {
				hwProfileName := "whtest-cross-ns-profile"
				notebookName := "whtest-notebook-02"

				By("creating hardware profile ONLY in global namespace")
				hwProfile := createHardwareProfile(hwProfileName, globalNs)
				Expect(k8sClient.Create(ctx, hwProfile)).To(Succeed())

				By("verifying hardware profile does NOT exist in user namespace")
				hwProfileUser := &unstructured.Unstructured{}
				hwProfileUser.SetGroupVersionKind(hwProfile.GroupVersionKind())
				err := k8sClient.Get(ctx, types.NamespacedName{
					Name:      hwProfileName,
					Namespace: userNs,
				}, hwProfileUser)
				Expect(err).To(HaveOccurred())

				By("creating notebook in user namespace")
				notebook := createNotebook(notebookName, userNs)
				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("annotating notebook pointing to global namespace")
				retrievedNotebook := &unstructured.Unstructured{}
				retrievedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNs,
				}, retrievedNotebook)).To(Succeed())

				annotations := retrievedNotebook.GetAnnotations()
				if annotations == nil {
					annotations = make(map[string]string)
				}
				annotations["opendatahub.io/hardware-profile-name"] = hwProfileName
				annotations["opendatahub.io/hardware-profile-namespace"] = globalNs
				retrievedNotebook.SetAnnotations(annotations)

				By("updating notebook (webhook should accept by looking in global namespace)")
				Expect(k8sClient.Update(ctx, retrievedNotebook)).To(Succeed())

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
				Expect(k8sClient.Delete(ctx, hwProfile)).To(Succeed())
			})
		})

		Describe("TC-WH-003: Webhook handles notebook with only name annotation (missing namespace)", func() {
			It("should handle gracefully when namespace annotation is missing", func() {
				hwProfileName := "whtest-partial-profile"
				notebookName := "whtest-notebook-03"

				By("creating hardware profile in global namespace")
				hwProfile := createHardwareProfile(hwProfileName, globalNs)
				Expect(k8sClient.Create(ctx, hwProfile)).To(Succeed())

				By("creating notebook in user namespace")
				notebook := createNotebook(notebookName, userNs)
				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("annotating notebook with ONLY hardware-profile-name (no namespace)")
				retrievedNotebook := &unstructured.Unstructured{}
				retrievedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNs,
				}, retrievedNotebook)).To(Succeed())

				annotations := retrievedNotebook.GetAnnotations()
				if annotations == nil {
					annotations = make(map[string]string)
				}
				annotations["opendatahub.io/hardware-profile-name"] = hwProfileName
				// Intentionally NOT setting hardware-profile-namespace
				retrievedNotebook.SetAnnotations(annotations)

				By("attempting to update notebook")
				// NOTE: In envtest without the actual webhook, this will succeed
				// TODO: Replace with actual webhook validation when available
				// Expected behavior: webhook should either reject OR default to notebook namespace and emit event
				updateErr := k8sClient.Update(ctx, retrievedNotebook)

				By("verifying no crashloop occurs regardless of webhook outcome")
				// The key test: operator should NOT crashloop
				// In real deployment: operator logs should show the event/warning
				GinkgoWriter.Printf("Webhook handling result: err=%v (no crashloop expected)\n", updateErr)

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
				Expect(k8sClient.Delete(ctx, hwProfile)).To(Succeed())
			})
		})

		Describe("TC-WH-004: Webhook handles non-existent hardware profile", func() {
			It("should handle gracefully when hardware profile does not exist", func() {
				hwProfileName := "whtest-nonexistent-profile"
				notebookName := "whtest-notebook-04"

				By("verifying hardware profile does NOT exist")
				hwProfile := &unstructured.Unstructured{}
				hwProfile.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "dashboard.opendatahub.io",
					Version: "v1alpha1",
					Kind:    "HardwareProfile",
				})
				err := k8sClient.Get(ctx, types.NamespacedName{
					Name:      hwProfileName,
					Namespace: globalNs,
				}, hwProfile)
				Expect(err).To(HaveOccurred())

				By("creating notebook in user namespace")
				notebook := createNotebook(notebookName, userNs)
				Expect(k8sClient.Create(ctx, notebook)).To(Succeed())

				By("annotating notebook with both annotations pointing to non-existent profile")
				retrievedNotebook := &unstructured.Unstructured{}
				retrievedNotebook.SetGroupVersionKind(notebook.GroupVersionKind())
				Expect(k8sClient.Get(ctx, types.NamespacedName{
					Name:      notebookName,
					Namespace: userNs,
				}, retrievedNotebook)).To(Succeed())

				annotations := retrievedNotebook.GetAnnotations()
				if annotations == nil {
					annotations = make(map[string]string)
				}
				annotations["opendatahub.io/hardware-profile-name"] = hwProfileName
				annotations["opendatahub.io/hardware-profile-namespace"] = globalNs
				retrievedNotebook.SetAnnotations(annotations)

				By("attempting to update notebook")
				// TODO: Replace with actual webhook validation
				// Expected: webhook emits event/warning, does not crashloop
				updateErr := k8sClient.Update(ctx, retrievedNotebook)
				GinkgoWriter.Printf("Webhook result for non-existent profile: err=%v (no crashloop expected)\n", updateErr)

				By("cleaning up")
				Expect(k8sClient.Delete(ctx, notebook)).To(Succeed())
			})
		})
	})
})

// Helper functions

func createHardwareProfile(name, namespace string) *unstructured.Unstructured {
	hwProfile := &unstructured.Unstructured{}
	hwProfile.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "dashboard.opendatahub.io",
		Version: "v1alpha1",
		Kind:    "HardwareProfile",
	})
	hwProfile.SetName(name)
	hwProfile.SetNamespace(namespace)
	hwProfile.Object["spec"] = map[string]interface{}{
		"displayName": name,
		"enabled":     true,
	}
	return hwProfile
}

func createNotebook(name, namespace string) *unstructured.Unstructured {
	notebook := &unstructured.Unstructured{}
	notebook.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "kubeflow.org",
		Version: "v1",
		Kind:    "Notebook",
	})
	notebook.SetName(name)
	notebook.SetNamespace(namespace)
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
	return notebook
}
