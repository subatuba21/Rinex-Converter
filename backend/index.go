package backend

import (
	"net/http"
	"os"
	"path/filepath"
)

var working_dir, _ = os.Getwd()
var REACT_DIR = filepath.Join(working_dir, "frontend/build/")

func (s *Server) HandleIndex() http.Handler {
	return http.FileServer(http.Dir(REACT_DIR))
}
