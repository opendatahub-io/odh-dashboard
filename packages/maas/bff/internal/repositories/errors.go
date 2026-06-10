package repositories

import "errors"

// ErrAlreadyExists is returned when attempting to create a resource that already exists.
var ErrAlreadyExists = errors.New("resource already exists")

// ErrNotFound is returned when a requested resource is not found.
var ErrNotFound = errors.New("resource not found")
