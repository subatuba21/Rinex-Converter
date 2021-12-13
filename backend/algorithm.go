package backend

import (
	"fmt"
	"math"

	"gonum.org/v1/gonum/mat"
)

var c float64 = 299792458

func Algorithm(data UnprocessedData) ProcessedData {
	const iterations = 4
	x, y, z, t := 4000000., 4000000., 4000000., 0.
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

	pseudorangevector := mat.NewVecDense(len(data.RINEXInfo.RinexEntries), satellitePseudoranges)
	satellitematrix := mat.NewDense(len(satellitePseudoranges), 4, availableSatData)

	for i := 0; i < iterations; i++ {
		xcorrection, ycorrection, zcorrection, tcorrection := solve(x, y, z, t, pseudorangevector, satellitematrix)
		x += xcorrection
		y += ycorrection
		z += zcorrection
		t += tcorrection
	}

	fmt.Println("Final results", x, y, z, t)

	return ProcessedData{}
}

func solve(x float64, y float64, z float64, t float64, pseudorangevector *mat.VecDense, satellitematrix *mat.Dense) (xcorrection float64, ycorrection float64, zcorrection float64, tcorrection float64) {
	numSatellites := pseudorangevector.Len()
	// Convert clock bias to seconds (its in microseconds)
	newClockBiasVector := mat.VecDenseCopyOf(satellitematrix.ColView(3))
	newClockBiasVector.ScaleVec(1.0/100000.0, newClockBiasVector)
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

	// matPrint(satellitematrix)
	// matPrint(newClockBiasVector)
	// Computing the pseudorange using initial values x, y, z
	ObservedMinusComputedPseudoRanges := mat.NewVecDense(numSatellites, nil)
	computedPseudoRange := mat.NewVecDense(numSatellites, nil)

	// (X(satellite) - X(reciever))^2
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

	computedPseudoRange.AddVec(changeInX, changeInY)
	computedPseudoRange.AddVec(computedPseudoRange, changeInZ)
	VectorPower(computedPseudoRange, .5)

	ObservedMinusComputedPseudoRanges.SubVec(pseudorangevector, computedPseudoRange)

	// Compute the partial derivatives
	// FORMULA: (x(0) - x(s))/(observed pseudorange)
	partialDerivativeMatrix := mat.NewDense(numSatellites, 4, nil)
	partialDerivativeX := mat.NewVecDense(numSatellites, nil)
	partialDerivativeX.SubVec(recieverX, newPosXVector)
	partialDerivativeX.DivElemVec(partialDerivativeX, computedPseudoRange)

	partialDerivativeY := mat.NewVecDense(numSatellites, nil)
	partialDerivativeY.SubVec(recieverY, newPosYVector)
	partialDerivativeY.DivElemVec(partialDerivativeY, computedPseudoRange)

	partialDerivativeZ := mat.NewVecDense(numSatellites, nil)
	partialDerivativeZ.SubVec(recieverZ, newPosZVector)
	partialDerivativeZ.DivElemVec(partialDerivativeZ, computedPseudoRange)

	partialDerivativeT := mat.NewVecDense(numSatellites, nil)
	for i := 0; i < partialDerivativeT.Len(); i++ {
		partialDerivativeT.SetVec(i, c*math.Pow(10, -9))
	}

	partialDerivativeMatrix.SetCol(0, partialDerivativeX.RawVector().Data)
	partialDerivativeMatrix.SetCol(1, partialDerivativeY.RawVector().Data)
	partialDerivativeMatrix.SetCol(2, partialDerivativeZ.RawVector().Data)

	solutions := mat.NewDense(4, 1, nil)
	solutions.Solve(partialDerivativeMatrix, ObservedMinusComputedPseudoRanges)

	matPrint(solutions)

	xcorrection = solutions.At(0, 0)
	ycorrection = solutions.At(1, 0)
	zcorrection = solutions.At(2, 0)
	tcorrection = solutions.At(3, 0)
	return
}

func matPrint(X mat.Matrix) {
	fa := mat.Formatted(X, mat.Prefix(""), mat.Squeeze())
	fmt.Printf("%v\n", fa)
}

func VectorPower(v *mat.VecDense, power float64) {
	if v != nil {
		for i := 0; i < v.Len(); i++ {
			val := v.At(i, 0)
			v.SetVec(i, math.Pow(val, power))
		}
	}
}
