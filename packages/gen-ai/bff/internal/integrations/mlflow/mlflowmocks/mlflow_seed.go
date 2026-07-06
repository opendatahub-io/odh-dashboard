package mlflowmocks

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
)

const seedTimeout = 30 * time.Second

// SeedPrompts registers sample prompts in the local MLflow instance.
func SeedPrompts(trackingURI string, logger *slog.Logger) error {
	client, err := mlflow.NewClient(
		mlflow.WithTrackingURI(trackingURI),
		mlflow.WithInsecure(),
	)
	if err != nil {
		return fmt.Errorf("failed to create MLflow client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), seedTimeout)
	defer cancel()

	reg := client.PromptRegistry()

	prompts := []struct {
		name      string
		versions  []seedVersion
		seedType  string
		textTempl string
	}{
		{
			name: "vet-appointment-dora",
			versions: []seedVersion{
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a veterinary clinic assistant. Help schedule appointments for dogs. Be friendly and professional."},
						{Role: "user", Content: "I need to schedule a vet appointment for my dog Dora on {{date}}. Reason: {{reason}}."},
					},
					commit: "Basic appointment scheduling for Dora",
					tags:   map[string]string{"pet": "dora", "breed": "mixed"},
				},
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a veterinary clinic assistant specializing in anxious dogs. Dora is a mixed breed who gets nervous at the vet. Always suggest calming strategies and allow extra time in appointments."},
						{Role: "user", Content: "Hi Dr. {{vet_name}}, I'd like to schedule an appointment for my dog Dora.\nDate: {{date}}\nReason: {{reason}}\nWeight: {{weight}}\n\nShe's a bit nervous at the vet, so please allow extra time."},
					},
					commit: "Detailed appointment request with anxiety note",
					tags:   map[string]string{"pet": "dora", "breed": "mixed", "formal": "true"},
				},
			},
			seedType: "chat",
		},
		{
			name: "pet-health-bella",
			versions: []seedVersion{
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a veterinary health analyst. Provide preliminary health assessments for dogs based on symptoms and vitals. Always recommend follow-up with a veterinarian for definitive diagnosis."},
						{Role: "user", Content: "Patient: Bella\nBreed: {{breed}}\nWeight: {{weight}}\nAge: {{age}}\n\nSymptoms: {{symptoms}}\n\nPlease provide a preliminary health assessment."},
					},
					commit: "Health summary with preliminary assessment",
					tags:   map[string]string{"pet": "bella", "category": "health"},
				},
			},
			seedType: "chat",
		},
		{
			name: "medication-reminder-ellie",
			versions: []seedVersion{
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a pet medication assistant. Generate clear, actionable medication reminders for dogs. Include any relevant warnings about food interactions or timing."},
						{Role: "user", Content: "Create a reminder for Ellie's medication: {{medication}} ({{dosage}}) at {{time}}. Notes: {{notes}}"},
					},
					commit: "Simple medication reminder",
					tags:   map[string]string{"pet": "ellie", "category": "medication"},
				},
				{
					messages: []promptregistry.ChatMessage{
						{Role: "system", Content: "You are a veterinary pharmacist assistant. Create detailed medication schedules for dogs. Include drug interaction warnings, storage instructions, and signs to watch for adverse reactions."},
						{Role: "user", Content: "Create a detailed medication schedule for Ellie:\n\nMedication: {{medication}}\nDosage: {{dosage}}\nFrequency: {{frequency}}\nTime: {{time}}\nDuration: {{duration}}\nPrescribed by: Dr. {{vet_name}}\n\nSpecial instructions: {{notes}}"},
					},
					commit: "Detailed medication schedule with safety info",
					tags:   map[string]string{"pet": "ellie", "category": "medication", "detailed": "true"},
				},
			},
			seedType: "chat",
		},
		{
			name:     "pet-adoption-letter",
			seedType: "text",
			textTempl: "Dear {{adopter_name}},\n\nCongratulations on adopting {{pet_name}}! Here are some tips for the first week:\n\n" +
				"1. Set up a quiet space for {{pet_name}} to decompress\n" +
				"2. Keep the same food brand: {{food_brand}}\n" +
				"3. First vet visit scheduled: {{vet_date}}\n" +
				"4. Emergency vet number: {{emergency_number}}\n\n" +
				"Welcome to the family, {{pet_name}}!",
			versions: []seedVersion{
				{
					commit: "Adoption welcome letter template",
					tags:   map[string]string{"category": "adoption", "type": "letter"},
				},
			},
		},
	}

	for _, p := range prompts {
		for _, v := range p.versions {
			var pv *promptregistry.PromptVersion
			var regErr error

			if p.seedType == "text" {
				pv, regErr = reg.RegisterPrompt(ctx, p.name, p.textTempl,
					promptregistry.WithCommitMessage(v.commit),
					promptregistry.WithTags(v.tags),
				)
			} else {
				pv, regErr = reg.RegisterChatPrompt(ctx, p.name, v.messages,
					promptregistry.WithCommitMessage(v.commit),
					promptregistry.WithTags(v.tags),
				)
			}

			if regErr != nil {
				return fmt.Errorf("failed to seed prompt %s: %w", p.name, regErr)
			}
			logger.Debug("Seeded prompt version",
				slog.String("name", p.name),
				slog.Int("version", pv.Version),
				slog.String("commit", v.commit),
			)
		}
	}

	logger.Info("Seeded MLflow with sample prompts", slog.Int("count", len(prompts)))
	return nil
}

type seedVersion struct {
	messages []promptregistry.ChatMessage
	commit   string
	tags     map[string]string
}
