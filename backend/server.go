package backend

import "net/http"

type Server struct {
	Router *http.ServeMux
}
