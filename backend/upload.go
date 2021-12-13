package backend

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

func (s *Server) HandleUpload() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseMultipartForm(32 << 20)

		if err != nil {
			fmt.Fprintf(w, "error")
			fmt.Println(err)
			return
		}

		file, _, err := r.FormFile("rinex")
		if err != nil {
			fmt.Fprintf(w, "error")
			fmt.Println(err)
			return
		}

		filebytes, err := ioutil.ReadAll(file)
		if err != nil {
			fmt.Fprintf(w, "error")
			fmt.Println(err)
			return
		}

		data, err := ProcessRINEX(filebytes)

		if err != nil {
			fmt.Fprintf(w, "error")
			fmt.Println(err)
			return
		}

		json, _ := json.Marshal(data)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, string(json))
	}
}
