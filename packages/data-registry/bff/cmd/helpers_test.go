package main

import (
	"flag"
	"io"
	"reflect"
	"testing"
)

func TestNewOriginParser(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected []string
	}{
		{"one item", "https://test.com", []string{"https://test.com"}},
		{"two items", "https://test.com,https://test2.com", []string{"https://test.com", "https://test2.com"}},
		{"two items spaced", "https://test.com,    https://test2.com", []string{"https://test.com", "https://test2.com"}},
		{"empty", "", []string{}},
		{"wildcard", "*", []string{"*"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var allowList []string
			parser := newOriginParser(&allowList, "")
			if err := parser(tc.input); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(allowList) != len(tc.expected) {
				t.Fatalf("expected len=%d got=%d", len(tc.expected), len(allowList))
			}
			for i := range allowList {
				if allowList[i] != tc.expected[i] {
					t.Fatalf("expected %v got %v", tc.expected, allowList)
				}
			}
		})
	}
}

func TestCommaSeparatedFlagDefaults(t *testing.T) {
	for _, name := range []string{"allowed-origins", "bundle-paths"} {
		t.Run(name, func(t *testing.T) {
			cases := []struct {
				name     string
				fallback string
				args     []string
				want     []string
			}{
				{"unset", "", nil, nil},
				{"environment only", " first, second ", nil, []string{"first", "second"}},
				{"flag overrides environment", "first,second", []string{"--" + name + "=third"}, []string{"third"}},
				{"explicit empty clears environment", "first", []string{"--" + name + "="}, nil},
				{"ignore empty entries", "", []string{"--" + name + "=, first, , second, "}, []string{"first", "second"}},
				{"last flag wins", "first", []string{"--" + name + "=second", "--" + name + "=third"}, []string{"third"}},
			}
			for _, tc := range cases {
				t.Run(tc.name, func(t *testing.T) {
					var values []string
					fs := flag.NewFlagSet("test", flag.ContinueOnError)
					fs.SetOutput(io.Discard)
					fs.Func(name, "", newOriginParser(&values, tc.fallback))
					if err := fs.Parse(tc.args); err != nil {
						t.Fatal(err)
					}
					if !reflect.DeepEqual(tc.want, values) {
						t.Fatalf("want %v, got %v", tc.want, values)
					}
				})
			}
		})
	}
}
