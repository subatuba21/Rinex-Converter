const md = 
`# About this App

This app essentially emulates GPS technology. It uses the same raw data available to a GPS (RINEX and Ephemeris files) and calculates the location using those files using an algorithm. To learn more about how it works, please look below.

## Definitions

GPS Reciever - The device that uses the GPS satellites to obtain its location. They are included in smartphones, cars, smartwatches, etc.

RINEX - A data format that contains certain measurements by the GPS reciever. This project uses Rinex Version 3.0. Here is a link to the [documentation on RINEX 3.0.](https://files.igs.org/pub/data/format/rinex303.pdf)

Pseudorange - A measurement included in the RINEX data format. It is the approximate distance from the satellite to the GPS reciever and its measured in meters.

![Pseudorange picture](/pictures/pseudorange.png)

Epoch - A specific moment in time.

Ephemeris Data - set of data that provides the assigned places of a celestial body (including a manmade satellite) for regular intervals. The data used in this app uses X, Y, and Z coordinates within the ECEF (Earth-centered Earth-fixed Coordinate Frame)

ECEF (Earth-centered Earth-fixed Coordinate Frame) - A coordinate system with origin at the center of the earth. The +X axis passes through the Equator and Prime Meridian intersection. The +Z axis passes through the North Pole. The +Y axis is orthogonal to +X and +Z. As a result, this coordinate system rotates with the earth. The distances used along each axis are meters.

![ECEF picture](/pictures/ecef.png)

FTP - File Transfer Protocol. A way to access and upload files to and from a server.

## What the application does (simplified)

It gets the distance from the GPS reciever to all the satellites within the range of the reciever (usually 8-10 satellites). It then finds where those satellites are within the ECEF coordinate frame. Using the positions of the satellites and their
distances from the receiver, the app is able to approximate location, just like a GPS.

## How the application works

1. A RINEX 3.0 file is uploaded to the server by the user. If you want to find some RINEX files to use other than the example files, please scroll down to *Using Your Own RINEX Files*.
2. The backend processes the file. It does this by using string manipulation to find patterns in the RINEX files and extract the data. The code snippet below demonstrates how the backend reads the RINEX file.
~~~go
// Initial RINEX reading function. Takes in bytes (not converted into string)
func ReadRINEX(file []byte) (*RINEXFile, error) {

    // Converts bytes into a string containing the RINEX info
	file_str := string(file)

    // Splits file into individual lines
	lines := strings.Split(file_str, "\\n")

    // This is the data structure that will store the information
	rinex := RINEXFile{
		Epochs: []RINEXEpoch{},
	}

	in_epoch := false
	currentEpoch := RINEXEpoch{}

	for _, line := range lines {

        // If the line is not empty and starts with '>', it is starting to describe a new epoch (location at a specific file). This application
        // only reads the first epoch in the RINEX file.
		if len(line) > 0 && line[0] == '>' {
            
            // If it's already in an epoch, that means the last epoch has ended, so the app will add the old epoch to the data structure.
			if in_epoch {
				rinex.Epochs = append(rinex.Epochs, currentEpoch)
			} else {
				in_epoch = true
			}

            // Function to read the epoch header line, which describes the exact time of the observation
			e, err := ReadRinexEpochHeaderLine(line)

			if err != nil {
				fmt.Printf("Error: %v", err)
				return nil, err
			}

			currentEpoch = *e

            // The next line detects whether the first character starts with G. Lines that start with G10 (or another number)
            // signify a satellite measurement.
		} else if len(line) > 0 && line[0:1] == "G" {
            // Calls function to process satellite line
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

    // Processes each character of the epoch header letter by letter
	for _, char := range line {
		if char == '>' {
			continue
		} else if char == ' ' {

            // If there's a space, that means the previous word (or number) has ended. This switch statement checks 
            // the index of the word within the epoch header to see what the word is describing
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

    // Reading character line by line, uses the same strategy as the ReadRinexEpochHeaderLine as above
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

    // Uses an array to assign words to information. First word 
    // in the line is G followed by the satellite id (ex. G10).
	gpsid, _ := strconv.Atoi(words[0][1:])
	entry.GPSID = gpsid
    // Pseudorange - distance from the reciever - is the second word.
	entry.Pseudorange, _ = strconv.ParseFloat(words[1], 64)
	return &entry, nil

}
~~~
3. Now that the server has processed the RINEX file, it has access to the time of the observation and the distances of the satellites from the GPS. Now, it
needs to locate where the satellites are in the sky during the GPS observation. It does this by downloading ephemeris data from the [CDDIS](https://cddis.nasa.gov/Data_and_Derived_Products/GNSS/orbit_products.html) by accessing the correct
file using FTP. 
~~~go

// Getting satelite data from CDDIS
// Sets up TLS
tlsconfig := tls.Config{
    InsecureSkipVerify: true,
    ClientAuth:         tls.RequestClientCert,
}
tlsoption := ftp.DialWithExplicitTLS(&tlsconfig)

// Connects to the CDDIS FTP Server
c, err := ftp.Dial("gdc.cddis.eosdis.nasa.gov:21", tlsoption, ftp.DialWithTimeout(10*time.Second))
if err != nil {
    fmt.Printf("Error: %v", err)
    return nil, err
}

// Logs in to the server. No username and password needed.
err = c.Login("anonymous", "anonymous")
if err != nil {
    fmt.Printf("Error: %v", err)
    return nil, err
}

if err != nil {
    fmt.Printf("Error: %v", err)
    return nil, err
}

// The files used were names using dates, except the dates were not traditional. 
// GPS week 2187 was the week of December 6th, 2021. I used an algorithm to extract
// the GPS date from the date provided in the RINEX file.
gpsdirectories := map[GPSWeekAndDay]bool{}
for k := range dates {
    fmt.Println(k.Year, time.Month(k.Month), k.Day)
    weekandday := CalculateGPSWeekAndDay(k.Year, time.Month(k.Month), k.Day)
    gpsdirectories[weekandday] = true
}


// Data structure used to read the satellite files.
satfiles := []SatelliteFile{}

for k := range gpsdirectories {

    // Navigated to the correct folder
    gpsresult, err := c.Retr(fmt.Sprintf("/pub/gps/products/%v/%v", k.week, fmt.Sprintf("igs%v%v.sp3.Z", k.week, k.day)))
    if err != nil {
        fmt.Println(err)
    }

    // Retrieved the ephemeris data file from the server.
    fmt.Println(fmt.Sprintf("/pub/gps/products/%v/%v", k.week, fmt.Sprintf("igs%v%v.sp3.Z", k.week, k.day)))

    gpsbytes, _ := ioutil.ReadAll(gpsresult)
    gpsresult.Close()

    // Decompressed the .Z file (zipped)
    r, _ := dcompress.NewReader(bytes.NewReader(gpsbytes))
    filebytes, _ := ioutil.ReadAll(r)

    // Reads data from satellite files - code not shown, but very similar to the 
    // ReadRINEX function. If you want to check it out, you can view the file on Github:
    // https://github.com/subatuba21/Rinex-Converter/blob/main/backend/data.go
    // Scroll down to the function ReadSatelliteFile (or CTRL-F)
    sat, _ := ReadSatelliteFile(filebytes)
    satfiles = append(satfiles, *sat)
}
~~~
4. After obtaining and processing the satellite files, the application has both the 
pseudoranges and XYZ coordinates of the satellites. It then uses a least-squares algorithm to find the X, Y, and Z coordinates 
of the GPS receiver.
~~~go
var c float64 = 299792458

// Runs the algorithm 10 times to get a stable solution.
const iterations = 10

func Algorithm(data UnprocessedData) ProcessedData {
    // Arbitrary initial values.
	x, y, z, t := 4331297.3480, 567555.6390, 4633133.7280, 0.

	for i := 0; i < iterations; i++ {
        // Solves the least-squares algorithm using the x, y, z, t, pseudoranges and satellite positions.
        // The more times the algorithm is run, the correction to x, y, and z will get smaller and smaller until it
        // is nearly 0, which means our location has been calculated
		xcorrection, ycorrection, zcorrection, tcorrection := solve(x, y, z, t, data)
		x += xcorrection
		y += ycorrection
		z += zcorrection
		t += tcorrection
	}

	// fmt.Println("Final results", x, y, z, t)
	geo1 := ellipsoid.Init("WGS84", ellipsoid.Degrees, ellipsoid.Meter, ellipsoid.LongitudeIsSymmetric, ellipsoid.BearingIsSymmetric)
	lat, long, _ := geo1.ToLLA(x, y, z)

	userLocation := UserLocation{
		PositionX: x,
		PositionY: y,
		PositionZ: z,
		Latitude:  lat,
		Longitude: long,
	}
	return ProcessedData{
		UserLocation:  userLocation,
		SatelliteInfo: data.SatelliteInfo,
		RINEXInfo:     data.RINEXInfo,
	}
}

func solve(x float64, y float64, z float64, t float64, data UnprocessedData) (xcorrection float64, ycorrection float64, zcorrection float64, tcorrection float64) {
	satellitePseudoranges := []float64{}
	availableSatData := []float64{}

	for _, rinexsat := range data.RINEXInfo.RinexEntries {
		satellitePseudoranges = append(satellitePseudoranges, rinexsat.Pseudorange)
		for _, sat := range data.SatelliteInfo.SatelliteEntries {
			if sat.GPSID == rinexsat.GPSID {
				availableSatData = append(availableSatData, sat.PositionX, sat.PositionY, sat.PositionZ, sat.ClockBias)
				break
			}
		}
	}

    // Creates a vector of pseudoranges
	pseudorangevector := mat.NewVecDense(len(data.RINEXInfo.RinexEntries), satellitePseudoranges)

    // Creates a matrix of (number of satellites) rows and 4 columns (x, y, z, and t values)
	satellitematrix := mat.NewDense(len(satellitePseudoranges), 4, availableSatData)

	numSatellites := pseudorangevector.Len()
	// Convert clock bias to seconds (its in microseconds)
	newClockBiasVector := mat.VecDenseCopyOf(satellitematrix.ColView(3))
	newClockBiasVector.ScaleVec(1.0/1000000.0, newClockBiasVector)
	satellitematrix.SetCol(3, newClockBiasVector.RawVector().Data)

	// Convert satellite position X to meters (currently in kilometers)
	newPosXVector := mat.VecDenseCopyOf(satellitematrix.ColView(0))
	newPosXVector.ScaleVec(1000, newPosXVector)
	satellitematrix.SetCol(0, newPosXVector.RawVector().Data)

	// Convert satellite position Y to meters (currently in kilometers)
	newPosYVector := mat.VecDenseCopyOf(satellitematrix.ColView(1))
	newPosYVector.ScaleVec(1000, newPosYVector)
	satellitematrix.SetCol(1, newPosYVector.RawVector().Data)

	// Convert satellite position Z to meters (currently in kilometers)
	newPosZVector := mat.VecDenseCopyOf(satellitematrix.ColView(2))
	newPosZVector.ScaleVec(1000, newPosZVector)
	satellitematrix.SetCol(2, newPosZVector.RawVector().Data)

	// Adjust PseudoRange for Satellite Clock bias
	// Convert clock bias into meters by multiplying by the speed of light (m/s), then add to PseudoRange

	newClockBiasVector.ScaleVec(c, newClockBiasVector)
	pseudorangevector.AddVec(pseudorangevector, newClockBiasVector)

	// Costructs vectors/matrices for delta p (actual minus computed pseudorange)
	ObservedMinusComputedPseudoRanges := mat.NewVecDense(numSatellites, nil)
	computedPseudoRange := mat.NewVecDense(numSatellites, nil)

	// calculates (X(satellite) - X(reciever))^2
	changeInX := mat.NewVecDense(numSatellites, nil)
	recieverX := mat.NewVecDense(numSatellites, nil)
	for i := 0; i < numSatellites; i++ {
		recieverX.SetVec(i, x)
	}
	changeInX.SubVec(newPosXVector, recieverX)
	VectorPower(changeInX, 2)

	// (Y(satellite) - Y(reciever))^2
	changeInY := mat.NewVecDense(numSatellites, nil)
	recieverY := mat.NewVecDense(numSatellites, nil)
	for i := 0; i < numSatellites; i++ {
		recieverY.SetVec(i, y)
	}
	changeInY.SubVec(newPosYVector, recieverY)
	VectorPower(changeInY, 2)

	// (Z(satellite) - Z(reciever))^2
	changeInZ := mat.NewVecDense(numSatellites, nil)
	recieverZ := mat.NewVecDense(numSatellites, nil)
	for i := 0; i < numSatellites; i++ {
		recieverZ.SetVec(i, z)
	}
	changeInZ.SubVec(newPosZVector, recieverZ)
	VectorPower(changeInZ, 2)

    // Calculates computed pseudorange (sqrt((x(satellite)-x(gps))^2) + (y(satellite)-y(gps))^2) + (z(satellite)-z(gps))^2))
	computedPseudoRange.AddVec(changeInX, changeInY)
	computedPseudoRange.AddVec(computedPseudoRange, changeInZ)
	VectorPower(computedPseudoRange, .5)

	ObservedMinusComputedPseudoRanges.SubVec(pseudorangevector, computedPseudoRange)

	// Compute the partial derivatives
	// FORMULA: (x(0 (initial value, arbitrary)) - x(satellite))/(computed pseudorange)
	partialDerivativeMatrix := mat.NewDense(numSatellites, 4, nil)
	partialDerivativeX := mat.NewVecDense(numSatellites, nil)
	partialDerivativeX.SubVec(recieverX, newPosXVector)
	partialDerivativeX.DivElemVec(partialDerivativeX, computedPseudoRange)

    // FORMULA: (y(0 (initial value, arbitrary)) - y(satellite))/(computed pseudorange)
	partialDerivativeY := mat.NewVecDense(numSatellites, nil)
	partialDerivativeY.SubVec(recieverY, newPosYVector)
	partialDerivativeY.DivElemVec(partialDerivativeY, computedPseudoRange)

    // FORMULA: (z(0 (initial value, arbitrary)) - z(satellite))/(computed pseudorange)
	partialDerivativeZ := mat.NewVecDense(numSatellites, nil)
	partialDerivativeZ.SubVec(recieverZ, newPosZVector)
	partialDerivativeZ.DivElemVec(partialDerivativeZ, computedPseudoRange)

	partialDerivativeT := mat.NewVecDense(numSatellites, nil)
	for i := 0; i < partialDerivativeT.Len(); i++ {
		partialDerivativeT.SetVec(i, c*math.Pow(10, -9))
	}

    // Assembles partial derivatives in the matrix
	partialDerivativeMatrix.SetCol(0, partialDerivativeX.RawVector().Data)
	partialDerivativeMatrix.SetCol(1, partialDerivativeY.RawVector().Data)
	partialDerivativeMatrix.SetCol(2, partialDerivativeZ.RawVector().Data)
	partialDerivativeMatrix.SetCol(3, partialDerivativeT.RawVector().Data)

    // Gonum, the numeric library used, has an inbuilt function for the least-squares solution
	solutions := mat.NewDense(4, 1, nil)
	solutions.Solve(partialDerivativeMatrix, ObservedMinusComputedPseudoRanges)

    // Now we have our correction parameters, or how much we need to change our initial values to minimize 
    // the difference in pseudorange
	xcorrection = solutions.At(0, 0)
	ycorrection = solutions.At(1, 0)
	zcorrection = solutions.At(2, 0)
	tcorrection = solutions.At(3, 0)
	return
}
~~~
5. The backend then uses a library to convert the ECEF coordinates to Latitude and Longitude. It then
sends back the calculated location of the GPS reciever along with information on the satellites to the front-end,
and the information is displayed on the website. The calculated location is plugged into Google Maps to see the calculations on a map.

## More about the algorithm

If you want to learn more about the algorithm, check out the slideshow by clicking on the icon below. Or,
check out [this report by Professor Ronni Grapenthin](http://www.grapenthin.org/notes/2019_03_11_pseudorange_position_estimation/).

## Using Your Own RINEX Files

You can find official RINEX files on the [CDDIS](https://cddis.nasa.gov/Data_and_Derived_Products/GNSS/daily_30second_data.html) website. Most of them are RINEX 2.0, but you can use this
[RINEX 2 to 3 converter](https://gps-solutions.com/gnss_converter) to convert it into RINEX 3. Then, plug in the RINEX 3.0 file into the website.
`

export default md;