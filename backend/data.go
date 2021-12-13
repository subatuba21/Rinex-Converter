package backend

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"io/ioutil"
	"strconv"
	"strings"
	"time"

	"github.com/hotei/dcompress"
	"github.com/jlaffaye/ftp"
)

type SatelliteFile struct {
	Epochs []SatelliteEpoch
}

type SatelliteEntry struct {
	GPSID     int
	PositionX float64
	PositionY float64
	PositionZ float64
	ClockBias float64
}

type SatelliteEpoch struct {
	SatelliteEntries []SatelliteEntry
	Year             int
	Month            int
	Day              int
	Hour             int
	Minutes          int
}

type Date struct {
	Year  int
	Month int
	Day   int
}

type GPSWeekAndDay struct {
	week int
	day  int
}

type RINEXFile struct {
	Epochs []RINEXEpoch
}

type RINEXEntry struct {
	GPSID          int
	Pseudorange    float64
	SignalStrength float64
	Doppler        float64
}

type RINEXEpoch struct {
	Year         int
	Month        int
	Day          int
	Hour         int
	Minutes      int
	Seconds      int
	RinexEntries []RINEXEntry
}

type UnprocessedData struct {
	SatelliteInfo SatelliteEpoch
	RINEXInfo     RINEXEpoch
}

type ProcessedData struct {
	GPSID         *string
	SatelliteInfo *[]SatelliteEntry
	RINEXInfo     *[]RINEXEntry
}

type UserLocation *struct {
	PositionX float64
	PositionY float64
	PositionZ float64
	Latitude  float64
	Longitude float64
	Date      Date
}

func ReadRINEX(file []byte) (*RINEXFile, error) {
	file_str := string(file)
	lines := strings.Split(file_str, "\n")
	rinex := RINEXFile{
		Epochs: []RINEXEpoch{},
	}

	in_epoch := false
	currentEpoch := RINEXEpoch{}

	for _, line := range lines {

		if len(line) > 0 && line[0] == '>' {
			if in_epoch {
				rinex.Epochs = append(rinex.Epochs, currentEpoch)
			} else {
				in_epoch = true
			}

			e, err := ReadRinexEpochHeaderLine(line)

			if err != nil {
				fmt.Printf("Error: %v", err)
				return nil, err
			}

			currentEpoch = *e

		} else if len(line) > 0 && line[0:1] == "G" {
			entry, err := ReadRinexInfoLine(line)
			if err != nil {
				fmt.Printf("Error: %v", err)
				return nil, err
			}

			currentEpoch.RinexEntries = append(currentEpoch.RinexEntries, *entry)
		}

		// Only want to read first 10 epochs to avoid overloading the app
		if len(rinex.Epochs) >= 10 {
			break
		}

	}

	return &rinex, nil
}

func ReadRinexEpochHeaderLine(line string) (*RINEXEpoch, error) {
	if line[0] != '>' {
		return nil, fmt.Errorf("error, epoch header doesn't start with *")
	}

	epoch := RINEXEpoch{}
	in_word := false
	word_index := 0
	current_word := ""

	for _, char := range line {
		if char == '>' {
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

				case 5:
					seconds, _ := strconv.Atoi(current_word)
					epoch.Seconds = seconds

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

func ReadRinexInfoLine(line string) (*RINEXEntry, error) {
	entry := RINEXEntry{}
	if line[0:1] != "G" {
		// Different type of satelite
		return nil, nil
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

	gpsid, _ := strconv.Atoi(words[0][1:])
	entry.GPSID = gpsid
	entry.Pseudorange, _ = strconv.ParseFloat(words[1], 64)
	return &entry, nil

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

		if len(line) > 0 && line[0:3] == "EOF" {
			if in_epoch {
				satfile.Epochs = append(satfile.Epochs, currentEpoch)
			}
		} else if len(line) > 0 && line[0] == '*' {
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
	entry.ClockBias, _ = strconv.ParseFloat(words[4], 64)
	return &entry, nil
}

func ProcessRINEXPart1(rinexfilebytes []byte) (*UnprocessedData, error) {
	rinex_file, err := ReadRINEX(rinexfilebytes)
	if err != nil {
		fmt.Printf("Error: %v", err)
		return nil, err
	}

	dates := map[Date]bool{}

	for _, epoch := range rinex_file.Epochs {
		date := Date{
			Year:  epoch.Year,
			Month: epoch.Month,
			Day:   epoch.Day,
		}

		if _, ok := dates[date]; !ok {
			dates[date] = true
		}
	}

	// Getting satelite data from CDDIS
	tlsconfig := tls.Config{
		InsecureSkipVerify: true,
		ClientAuth:         tls.RequestClientCert,
	}
	tlsoption := ftp.DialWithExplicitTLS(&tlsconfig)

	c, err := ftp.Dial("gdc.cddis.eosdis.nasa.gov:21", tlsoption, ftp.DialWithTimeout(10*time.Second))
	if err != nil {
		fmt.Printf("Error: %v", err)
		return nil, err
	}

	err = c.Login("anonymous", "anonymous")
	if err != nil {
		fmt.Printf("Error: %v", err)
		return nil, err
	}

	if err != nil {
		fmt.Printf("Error: %v", err)
		return nil, err
	}

	gpsdirectories := map[GPSWeekAndDay]bool{}
	for k := range dates {
		fmt.Println(k.Year, time.Month(k.Month), k.Day)
		weekandday := CalculateGPSWeekAndDay(k.Year, time.Month(k.Month), k.Day)
		gpsdirectories[weekandday] = true
	}

	fmt.Println(gpsdirectories)

	satfiles := []SatelliteFile{}

	for k := range gpsdirectories {
		gpsresult, err := c.Retr(fmt.Sprintf("/pub/gps/products/%v/%v", k.week, fmt.Sprintf("igs%v%v.sp3.Z", k.week, k.day)))
		if err != nil {
			fmt.Println(err)
		}

		fmt.Println(fmt.Sprintf("/pub/gps/products/%v/%v", k.week, fmt.Sprintf("igs%v%v.sp3.Z", k.week, k.day)))

		gpsbytes, _ := ioutil.ReadAll(gpsresult)
		gpsresult.Close()

		r, _ := dcompress.NewReader(bytes.NewReader(gpsbytes))
		filebytes, _ := ioutil.ReadAll(r)
		sat, _ := ReadSatelliteFile(filebytes)
		satfiles = append(satfiles, *sat)
	}

	ProcessRINEXPart2(satfiles, *rinex_file)

	return nil, nil
}

func CalculateGPSWeekAndDay(year int, month time.Month, day int) GPSWeekAndDay {
	baseDate := time.Date(2006, 1, 1, 0, 0, 0, 0, time.UTC)
	baseGPSWeek := 1356
	currentDate := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	duration := currentDate.Sub(baseDate)
	weeksDifference := int(duration.Hours() / 168)
	daysDifference := int(duration.Hours() / 24)
	GPSWeek := weeksDifference + baseGPSWeek
	GPSDay := daysDifference % 7
	return GPSWeekAndDay{week: GPSWeek, day: GPSDay}
}

func ProcessRINEXPart2(satfiles []SatelliteFile, rinexfile RINEXFile) {
	count := 1
	for _, epoch := range rinexfile.Epochs {
		for _, file := range satfiles {
			for _, satepoch := range file.Epochs {
				if epoch.Year == satepoch.Year && epoch.Month == satepoch.Month && epoch.Day == satepoch.Day && epoch.Hour == satepoch.Hour && (epoch.Minutes >= satepoch.Minutes && epoch.Minutes-15 <= satepoch.Minutes) {

					fmt.Println(count, satepoch.Year, satepoch.Day, satepoch.Month, satepoch.Hour, satepoch.Minutes, epoch.Minutes)
					count++

					unprocessedData := UnprocessedData{
						SatelliteInfo: satepoch,
						RINEXInfo:     epoch,
					}

					Algorithm(unprocessedData)

				}
			}
		}
	}
}
