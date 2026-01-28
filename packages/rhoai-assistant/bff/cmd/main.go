package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/api"
)

func main() {
	port := flag.Int("port", 4001, "Server port")
	flag.Parse()

	// Override with env var if set
	if envPort := os.Getenv("PORT"); envPort != "" {
		fmt.Sscanf(envPort, "%d", port)
	}

	router := api.NewRouter()

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("RHOAI Assistant BFF starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, router))
}
