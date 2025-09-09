package repositories

import (
	"fmt"
	"strings"
	"text/template"
)

// TemplateRepository handles template operations
type TemplateRepository struct {
	templates map[string]*template.Template
}

// NewTemplateRepository creates a new template repository
func NewTemplateRepository() *TemplateRepository {
	return &TemplateRepository{
		templates: make(map[string]*template.Template),
	}
}

// ParseTemplate parses a template string and stores it
func (tr *TemplateRepository) ParseTemplate(name, templateStr string) error {
	tmpl, err := template.New(name).Parse(templateStr)
	if err != nil {
		return fmt.Errorf("failed to parse template %s: %w", name, err)
	}

	tr.templates[name] = tmpl
	return nil
}

// ExecuteTemplate executes a named template with the given data
func (tr *TemplateRepository) ExecuteTemplate(name string, data interface{}) (string, error) {
	tmpl, exists := tr.templates[name]
	if !exists {
		return "", fmt.Errorf("template %s not found", name)
	}

	var buf strings.Builder
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute template %s: %w", name, err)
	}

	return buf.String(), nil
}
