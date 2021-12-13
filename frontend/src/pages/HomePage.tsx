import { Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { Dot } from "react-animated-dots";
import "./HomePage.css";
import { ChangeEvent, useState } from "react";

const upload_page = "u";
const processing_page = "p";
const results_page = "r";

type HomePageProps = {
  homeState: [
    page: string,
    setPage: React.Dispatch<React.SetStateAction<string>>
  ];
};

export function HomePage(props: HomePageProps) {
  const [page, setPage] = props.homeState;
  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    setPage(processing_page);
    console.log(event.target.value);
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
            <p>Antarctica</p>
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
          <div className="example-file">
            <p>Europe</p>
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
    return <></>;
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
