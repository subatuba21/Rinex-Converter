import React, { useState } from "react";
import "./App.css";
import NavBottom from "./components/navbar-bottom/NavBottom";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import TopBar from "./components/navbar-bottom/TopBar";
import {HomePage, PageStatus} from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";

function App() {

  const pageState = useState(PageStatus.upload_page);
  const resultsState = useState<any>(null)
  
  return (
    <div className="App">
      <TopBar></TopBar>
      <div id="computer-only">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage homeState={pageState} resultsState={resultsState}></HomePage>}></Route>
          </Routes>
          <Routes>
            <Route path="/about" element={<AboutPage></AboutPage>}></Route>
          </Routes>
          <NavBottom></NavBottom>
        </BrowserRouter>
      </div>
      <div id="mobile-only">
        <h1 className="accent-color-text"><em>This application is not available on mobile devices</em></h1>
      </div>
    </div>
  );
}

export default App;
