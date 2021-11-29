package main

import (
	"fmt"
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

	f, _ := ioutil.ReadFile("test_files/igs21825.sp3")
	file, _ := backend.ReadSatelliteFile(f)
	for _, epoch := range file.Epochs {
		fmt.Printf("\n\nHour: %v, Minutes: %v \n\n\n", epoch.Hour, epoch.Minutes)
		for _, sat := range epoch.SatelliteEntries {
			fmt.Printf("Satellite ID: %v, X: %v, Y: %v, Z: %v\n", sat.GPSID, sat.PositionX, sat.PositionY, sat.PositionZ)
		}
	}

	log.Fatal(http.ListenAndServe(":80", server.Router))
}
