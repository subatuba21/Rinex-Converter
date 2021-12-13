package main

import (
	"io/ioutil"
	"log"
	"net/http"

	"github.com/subatuba21/rinex-converter/backend"
)

func main() {
	var server *backend.Server = &backend.Server{
		Router: &http.ServeMux{},
	}
	server.Routes()

	f, _ := ioutil.ReadFile("test_files/rinex.txt")
	// file, _ := backend.ReadRINEX(f)
	// for _, epoch := range file.Epochs {
	// 	fmt.Printf("\n\nHour: %v, Minutes: %v \n\n\n", epoch.Hour, epoch.Minutes)
	// 	for _, rinex := range epoch.RinexEntries {
	// 		fmt.Printf("Satellite ID: %v, Pseudorange: %v", rinex.GPSID, rinex.Pseudorange)
	// 	}
	// }

	backend.ProcessRINEXPart1(f)

	log.Fatal(http.ListenAndServe(":80", server.Router))
}
