import { Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { Dot } from "react-animated-dots";
import "./HomePage.css";
import { ChangeEvent } from "react";
import MapComponent from "../mapsapi";

const upload_page = "u";
const processing_page = "p";
const results_page = "r";

type HomePageProps = {
  homeState: [
    page: string,
    setPage: React.Dispatch<React.SetStateAction<string>>
  ];
  resultsState: [
    results: Response | null,
    setResults: React.Dispatch<React.SetStateAction<Response | null>>
  ];
};

type SatelliteEntry = {
  GPSID: number;
  PositionX: number;
  PositionY: number;
  PositionZ: number;
  ClockBias: number;
};

type RINEXEntry = {
  GPSID: number;
  Pseudorange: number;
};

type EpochData = {
  UserLocation: {
    PositionX: number;
    PositionY: number;
    PositionZ: number;
    Latitude: number;
    Longitude: number;
  };
  SatelliteInfo: {
    SatelliteEntries: Array<SatelliteEntry>;
  };
  RINEXInfo: {
    Year: number;
    Month: number;
    Day: number;
    Hour: number;
    Minutes: number;
    Seconds: number;
    RinexEntries: Array<RINEXEntry>;
  };
};

type Response = Array<EpochData>;

export function HomePage(props: HomePageProps) {
  const [page, setPage] = props.homeState;
  const [results, setResults] = props.resultsState;

  function returnToUpload() {
    setPage(upload_page);
    setResults(null);
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const formData = new FormData();
    if (event.target.files && event.target.files.length > 0) {
      formData.append("rinex", event.target.files[0]);
      console.log(event.target.files);
      setPage(processing_page);

      fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((res) => {
          setResults(res);
          setPage(results_page);
        });
    }
  }

  function onRequestExample(exampleName: string) {
    return function (event: any) {
      setPage(processing_page);

      fetch("/api/example", {
        method: "POST",
        body: exampleName,
      })
        .then((res) => res.json())
        .then((res) => {
          setResults(res);
          setPage(results_page);
        });
    };
  }

  function SatelliteInfo() {
    const entries: Array<JSX.Element> = [];
    if (results && results.length > 0) {
      const epoch = results[0];
      console.log(epoch);
      for (var entry of epoch.RINEXInfo.RinexEntries) {
        // eslint-disable-next-line no-loop-func
        const satentry = epoch.SatelliteInfo.SatelliteEntries.find(
          (val) => val.GPSID === entry.GPSID
        );
        entries.push(
          <div className="satelliteInfo">
            <h3>Satellite ID: {entry.GPSID}</h3>
            <p>
              <span>Pseudorange: {entry.Pseudorange}</span>
              <br />
              <span>ECEF X-Coordinate: {satentry?.PositionX}</span>
              <br />
              <span>ECEF Y-Coordinate: {satentry?.PositionY}</span>
              <br />
              <span>ECEF Z-Coordinate: {satentry?.PositionZ}</span>
              <br />
            </p>
          </div>
        );
      }
    }

    return <div id="satInfoContainer">{entries}</div>;
  }

  if (page === upload_page) {
    return (
      <div id="home-page">
        <div id="example-section">
          <iframe
            src="/rinex.txt"
            title="example rinex file"
            id="rinex-file"
            width="100%"
            height="100%"
          ></iframe>
        </div>
        <div id="upload-section">
          Please upload a{" "}
          <em className="accent-color-text">RINEX 3.0 MIXED file</em> (example
          on the left). The application will process the data and show the
          corresponding location.
          <Button variant="contained" component="label" id="upload-button">
            Upload File
            <input type="file" hidden onChange={onUpload} />
          </Button>
          <br></br>
          If you don't have a RINEX file ready, you can try the example RINEX
          files below.
          <div className="example-file">
            <p onClick={onRequestExample("AntarticaMcMurdoStation")}>
              Antarctica - McMurdo Station
            </p>
            <div className="download-icon">
              <a
                href="/antarctica.txt"
                target="_blank"
                download="antarctica.txt"
              >
                <DownloadIcon></DownloadIcon>
              </a>
            </div>
          </div>
          <div className="example-file">
            <p
              onClick={onRequestExample(
                "SwitzerlandUniversitätssternwarteZimmerwald"
              )}
            >
              Switzerland - Universitätssternwarte Zimmerwald
            </p>
            <div className="download-icon">
              <a
                href="/switzerland.txt"
                target="_blank"
                download="switzerland.txt"
              >
                <DownloadIcon></DownloadIcon>
              </a>
            </div>
          </div>
          <div className="example-file">
            <p>India GPS Station - Latitude 67, longitude 69</p>
            <div className="download-icon">
              <a
                href="/rinex.txt"
                target="_blank"
                download="Antartica_Rinex.txt"
              >
                <DownloadIcon></DownloadIcon>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (page === processing_page) {
    return (
      <div id="processing">
        <h2>
          Processing
          <Dot>.</Dot>
          <Dot>.</Dot>
          <Dot>.</Dot>
        </h2>
      </div>
    );
  } else if (page === results_page) {
    return (
      <div id="results">
        <div id="left">
          <div id="map">
            <MapComponent
              latitude={results ? results[0].UserLocation.Latitude : 0}
              longitude={results ? results[0].UserLocation.Longitude : 0}
            ></MapComponent>
          </div>
        </div>
        <div id="right">
          <p>
            <h2>ECEF Coordinates</h2>
            X: {results ? results[0].UserLocation.PositionX : ""} meters
            <br />
            Y: {results ? results[0].UserLocation.PositionY : ""} meters
            <br />
            Z: {results ? results[0].UserLocation.PositionX : ""} meters
            <br />
            <br />
            <h2>Latitude and Longitude</h2>
            Latitude: {results ? results[0].UserLocation.Latitude : ""}
            <br />
            Longitude: {results ? results[0].UserLocation.Longitude : ""}
            <br />
            <br />
            <span style={{ fontSize: "1.3rem" }}>
              {" "}
              Want to know how the application calculated these values? Click
              the info button on the bottom right to learn more.
            </span>
            <br />
            <br />
            <span
              onClick={returnToUpload}
              style={{
                fontSize: "1.3rem",
                color: "var(--accent-color)",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Go back to upload page.
            </span>
          </p>
        </div>
        <div id="stats">
          <h2>Satellites Used In Calculation</h2>
          <SatelliteInfo></SatelliteInfo>
        </div>
      </div>
    );
  } else {
    setPage(upload_page);
    return <></>;
  }
  return <></>;
}

export const PageStatus = {
  upload_page: "u",
  processing_page: "p",
  results_page: "r",
};
