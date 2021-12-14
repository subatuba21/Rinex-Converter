package backend

import (
	"net/http"
	"os"
	"path/filepath"
	"regexp"
)

var working_dir, _ = os.Getwd()
var REACT_DIR = filepath.Join(working_dir, "frontend/build/")

func (s *Server) HandleIndex() http.HandlerFunc {
	fileServer := http.FileServer(http.Dir(REACT_DIR))
	fileMatcher := regexp.MustCompile(`\.[a-zA-Z]*$`)
	return func(w http.ResponseWriter, r *http.Request) {
		if !fileMatcher.MatchString(r.URL.Path) {
			http.ServeFile(w, r, REACT_DIR+"/index.html")
		} else {
			fileServer.ServeHTTP(w, r)
		}
	}

}
