import React from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
} from "@react-google-maps/api";

const containerStyle = {
  width: "90%",
  height: "500px",
};

function MapComponent({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const center = {
    lat: latitude,
    lng: longitude,
  };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_MAPS_API_CODE as string}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={8}>
        <Marker position={center}></Marker>
      </GoogleMap>
    </LoadScript>
  );
}

export default React.memo(MapComponent);
