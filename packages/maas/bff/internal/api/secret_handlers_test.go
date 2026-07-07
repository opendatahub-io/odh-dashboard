package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

var _ = Describe("SecretHandlers", Ordered, func() {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	It("lists Secret names without values", func() {
		actual, rs, err := setupApiTest[Envelope[[]models.SecretSummary, None]](
			http.MethodGet,
			"/api/v1/secrets?namespace=maas-models",
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))
		Expect(len(actual.Data)).To(BeNumerically(">=", 1))

		body, err := json.Marshal(actual)
		Expect(err).NotTo(HaveOccurred())
		Expect(string(body)).NotTo(ContainSubstring("test-key-value"))
	})

	It("creates a Secret and returns only the name", func() {
		secretName := fmt.Sprintf("test-secret-%d", GinkgoRandomSeed())

		actual, rs, err := setupApiTest[Envelope[*models.CreateSecretResponse, None]](
			http.MethodPost,
			"/api/v1/secrets",
			Envelope[models.CreateSecretRequest, None]{
				Data: models.CreateSecretRequest{
					Namespace: "maas-models",
					Name:      secretName,
					Value:     "super-secret-value",
				},
			},
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusCreated))
		Expect(actual.Data.Name).To(Equal(secretName))

		body, err := json.Marshal(actual)
		Expect(err).NotTo(HaveOccurred())
		Expect(string(body)).NotTo(ContainSubstring("super-secret-value"))

		created, err := clientset.CoreV1().Secrets("maas-models").Get(
			context.Background(),
			secretName,
			metav1.GetOptions{},
		)
		Expect(err).NotTo(HaveOccurred())
		Expect(created.Labels).To(HaveKeyWithValue("inference.networking.k8s.io/bbr-managed", "true"))
	})

	It("lists only secrets with the BBR-managed label", func() {
		unlabeledName := fmt.Sprintf("unlabeled-secret-%d", GinkgoRandomSeed())
		_, err := clientset.CoreV1().Secrets("maas-models").Create(
			context.Background(),
			&corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      unlabeledName,
					Namespace: "maas-models",
				},
				Type: corev1.SecretTypeOpaque,
				StringData: map[string]string{
					"api-key": "other-value",
				},
			},
			metav1.CreateOptions{},
		)
		Expect(err).NotTo(HaveOccurred())

		actual, rs, err := setupApiTest[Envelope[[]models.SecretSummary, None]](
			http.MethodGet,
			"/api/v1/secrets?namespace=maas-models",
			nil,
			k8Factory,
			identity,
		)

		Expect(err).NotTo(HaveOccurred())
		Expect(rs.StatusCode).To(Equal(http.StatusOK))

		for _, secret := range actual.Data {
			Expect(secret.Name).NotTo(Equal(unlabeledName))
		}
	})
})
