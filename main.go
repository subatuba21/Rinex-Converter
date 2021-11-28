package main

import (
	"log"
	"net/http"

	"github.com/subatuba21/rinex-converter/backend"
)

func main() {
	var server *backend.Server = &backend.Server{
		Router: &http.ServeMux{},
	}
	server.Routes()

	log.Fatal(http.ListenAndServe(":80", server.Router))
}
