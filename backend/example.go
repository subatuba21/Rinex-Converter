package backend

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

func (s *Server) HandleExample() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		body, _ := ioutil.ReadAll(r.Body)
		exampleName := string(body)
		var filename string = ""
		if exampleName == "AntarticaMcMurdoStation" {
			filename = "frontend/public/antarctica.txt"
		} else if exampleName == "SwitzerlandUniversitätssternwarteZimmerwald" {
			filename = "frontend/public/switzerland.txt"
		} else if exampleName == "Other" {

		} else {
			fmt.Fprint(w, "No available example file specified.")
			return
		}

		filebytes, err := ioutil.ReadFile(filename)
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
