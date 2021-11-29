package backend

import (
	"fmt"
	"strconv"
	"strings"
)

type SatelliteFile struct {
	Epochs []SatelliteEpoch
}

type SatelliteEntry struct {
	GPSID     int
	PositionX float64
	PositionY float64
	PositionZ float64
}

type SatelliteEpoch struct {
	SatelliteEntries []SatelliteEntry
	Year             int
	Month            int
	Day              int
	Hour             int
	Minutes          int
}

type RINEXFile struct {
	Epochs *[]RINEXEpoch
}

type RINEXEntry struct {
	GPSID          *string
	Pseudorange    *float64
	SignalStrength *float64
	Doppler        *float64
}

type RINEXEpoch struct {
	Time         *float64
	RinexEntries *[]RINEXEntry
}

type UnprocessedData struct {
	GPSID         *string
	SatelliteInfo *[]SatelliteEpoch
	RINEXInfo     *[]RINEXEpoch
}

type ProcessedEData struct {
	GPSID         *string
	SatelliteInfo *[]SatelliteEntry
	RINEXInfo     *[]RINEXEntry
	UserLocation  *struct {
		PositionX *float64
		PositionY *float64
		PositionZ *float64
		Latitude  *float64
		Longitude *float64
	}
}

func ReadRINEX(file []byte) (*RINEXFile, error) {
	file_str := string(file)
	lines := strings.Split(file_str, "\n")

	in_header := true
	// rinex_version := ""

	for _, line := range lines {

		if strings.Contains(line, "END OF HEADER") {
			fmt.Println("END OF HEADER")
			return nil, nil
		}

		if !in_header {
			return nil, nil
		}
	}

	return nil, nil
}

func ReadSatelliteFile(file []byte) (*SatelliteFile, error) {
	file_str := string(file)
	lines := strings.Split(file_str, "\n")
	satfile := SatelliteFile{
		Epochs: []SatelliteEpoch{},
	}

	in_epoch := false

	currentEpoch := SatelliteEpoch{}
	for _, line := range lines {

		if len(line) > 0 && line[0] == '*' {
			if in_epoch {
				satfile.Epochs = append(satfile.Epochs, currentEpoch)
			} else {
				in_epoch = true
			}

			e, err := readSatelliteEpochHeader(line)

			if err != nil {
				fmt.Printf("Error: %v", err)
				return nil, err
			}

			currentEpoch = *e
		} else if len(line) > 0 && line[0:2] == "PG" {
			entry, err := ReadSatelliteInfoLine(line)
			if err != nil {
				fmt.Printf("Error: %v", err)
				return nil, err
			}

			currentEpoch.SatelliteEntries = append(currentEpoch.SatelliteEntries, *entry)
		}

	}

	return &satfile, nil
}

func readSatelliteEpochHeader(line string) (*SatelliteEpoch, error) {
	if line[0] != '*' {
		return nil, fmt.Errorf("error, epoch header doesn't start with *")
	}

	epoch := SatelliteEpoch{}
	in_word := false
	word_index := 0
	current_word := ""

	for _, char := range line {
		if char == '*' {
			continue
		} else if char == ' ' {

			if in_word {
				switch word_index {
				case 0:
					year, _ := strconv.Atoi(current_word)
					epoch.Year = year

				case 1:
					month, _ := strconv.Atoi(current_word)
					epoch.Month = month

				case 2:
					day, _ := strconv.Atoi(current_word)
					epoch.Day = day

				case 3:
					hour, _ := strconv.Atoi(current_word)
					epoch.Hour = hour

				case 4:
					minutes, _ := strconv.Atoi(current_word)
					epoch.Minutes = minutes

				default:

				}

				word_index++
				in_word = false
				current_word = ""
			}

		} else {

			if !in_word {
				in_word = true
			}

			current_word += string(char)
		}

	}

	return &epoch, nil
}

func ReadSatelliteInfoLine(line string) (*SatelliteEntry, error) {
	entry := SatelliteEntry{}
	if line[0:2] != "PG" {
		return nil, fmt.Errorf("error: line does not start with pg")
	}

	in_word := false
	current_word := ""
	words := []string{}
	for _, char := range line {
		if char == ' ' {
			if in_word {
				words = append(words, current_word)
				in_word = false
				current_word = ""
			}
		} else {
			in_word = true
			current_word += string(char)
		}
	}

	gpsid, _ := strconv.Atoi(words[0][2:])
	entry.GPSID = gpsid
	entry.PositionX, _ = strconv.ParseFloat(words[1], 64)
	entry.PositionY, _ = strconv.ParseFloat(words[2], 64)
	entry.PositionZ, _ = strconv.ParseFloat(words[3], 64)
	return &entry, nil
}
