import React from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = {
  width: '90%',
  height: '500px'
};


function MapComponent({latitude, longitude}: {latitude: number, longitude: number}) {

  const center = {
    lat: latitude,
    lng: longitude
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_MAPS_API_CODE as string
  })

  const [map, setMap] = React.useState(null)

  const onLoad = React.useCallback(function callback(map) {
    const bounds = new window.google.maps.LatLngBounds();
    map.fitBounds(bounds);
    setMap(map)
  }, [])

  const onUnmount = React.useCallback(function callback(map) {
    setMap(null)
  }, [])

  return isLoaded ? (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={0}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        <Marker position={center}></Marker>
      </GoogleMap>
  ) : <></>
}

export default MapComponent