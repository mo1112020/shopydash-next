"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, Polygon, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface RegionMapDrawerProps {
  initialCoordinates: { lat: number; lng: number }[];
  onCoordinatesChange: (coords: { lat: number; lng: number }[]) => void;
}

function MapClickAccumulator({
  points,
  onChange,
}: {
  points: { lat: number; lng: number }[];
  onChange: (pts: { lat: number; lng: number }[]) => void;
}) {
  useMapEvents({
    click(e) {
      onChange([...points, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    },
  });

  const positions = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <>
      {positions.map((pos, idx) => (
        <Marker
          key={idx}
          position={pos}
          eventHandlers={{
            click: () => {
              onChange(points.filter((_, i) => i !== idx));
            },
          }}
        />
      ))}
      {points.length >= 3 ? (
        <Polygon positions={positions} pathOptions={{ color: "blue" }} />
      ) : points.length > 0 ? (
        <Polyline positions={positions} pathOptions={{ color: "blue", dashArray: "5, 5" }} />
      ) : null}
    </>
  );
}

export default function RegionMapDrawer({ initialCoordinates, onCoordinatesChange }: RegionMapDrawerProps) {
  const defaultCenter =
    initialCoordinates.length > 0
      ? [initialCoordinates[0].lat, initialCoordinates[0].lng]
      : [31.0603, 30.3254];

  return (
    <div className="h-full w-full">
      <MapContainer
        center={defaultCenter as [number, number]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <MapClickAccumulator points={initialCoordinates} onChange={onCoordinatesChange} />
      </MapContainer>
    </div>
  );
}
