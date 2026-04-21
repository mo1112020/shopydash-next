"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Polygon, // Added Polygon
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { notify } from "@/lib/notify";
import { isPointInPolygon } from "@/lib/geo-utils"; // Added import
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription, // Added
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
// ... imports ...
import {
  Navigation,
  Loader2,
  MapPinOff,
  Check,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Ban, // Added Ban import
} from "lucide-react";

// ... existing code ...

// Custom red marker icon for better visibility
const customMarkerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

// Component to handle map events and marker dragging
function DraggableMarker({
  position,
  onPositionChange,
}: {
  position: GeoCoordinates;
  onPositionChange: (pos: GeoCoordinates) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onPositionChange({ lat: latlng.lat, lng: latlng.lng });
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
      icon={customMarkerIcon}
    />
  );
}

// Component to handle map click events
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (pos: GeoCoordinates) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Component to center map on position
function CenterMapOnPosition({ position }: { position: GeoCoordinates }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom());
  }, [position, map]);
  return null;
}

// NEW: Component to fit bounds to region
function FitBoundsToRegion({ boundary }: { boundary: GeoCoordinates[] | undefined }) {
  const map = useMap();
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (boundary && boundary.length >= 3 && !hasFitRef.current) {
       const bounds = L.latLngBounds(boundary.map(p => [p.lat, p.lng]));
       if (bounds.isValid()) {
           map.fitBounds(bounds, { padding: [20, 20] });
           hasFitRef.current = true;
       }
    }
  }, [boundary, map]);
  
  // Reset ref if boundary changes significantly (optional, but good if region changes)
  useEffect(() => {
      hasFitRef.current = false;
  }, [boundary]);

  return null;
}

// Zoom controls component
function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute bottom-24 left-3 z-[1000] flex flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-9 w-9 shadow-lg"
        onClick={() => map.zoomIn()}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-9 w-9 shadow-lg"
        onClick={() => map.zoomOut()}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// NEW: Boundary Mask Component
// Draws a "Donut" polygon: Outer world bounds - Inner region hole
// This makes the outside area dimmed, and the inside area clear.
// -----------------------------------------------------------------------------


function BoundaryMask({ boundary }: { boundary: GeoCoordinates[] }) {
  if (!boundary || boundary.length < 3) return null;

  // Define a polygon that covers the entire world (huge rectangle)
  const outerBounds = [
    [90, -180],
    [90, 180],
    [-90, 180],
    [-90, -180],
  ];

  // Convert our boundary objects to Leaflet arrays
  // IMPORTANT: For holes to work properly in some renderers, winding order matters, 
  // but Leaflet usually handles [Outer, Inner] fine regardless.
  const innerHole = boundary.map(p => [p.lat, p.lng]);

  // Leaflet Polygon: First ring is outer, subsequent rings are holes
  const positions: any = [outerBounds, innerHole];

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: 'transparent',
        fillColor: '#000000',
        fillOpacity: 0.5,
        stroke: false,
        className: 'boundary-mask' // Helpful for debugging
      }}
    />
  );
}

// -----------------------------------------------------------------------------
// NEW: Boundary Border Line
// A separate stroke for the actual region boundary to make it pop
// -----------------------------------------------------------------------------
function BoundaryBorder({ boundary }: { boundary: GeoCoordinates[] }) {
  if (!boundary || boundary.length < 3) return null;
  const positions = boundary.map(p => [p.lat, p.lng] as [number, number]);
  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: '#22c55e', // Success Green
        weight: 3,
        fill: false,      // No fill, just border (mask handles the fill effect)
        dashArray: '10, 10' // Dashed line for effect
      }}
    />
  );
}

interface MapLocationPickerProps {
  initialPosition?: GeoCoordinates;
  onLocationSelect: (coordinates: GeoCoordinates) => void;
  open: boolean;
  onClose: () => void;
  regionBoundary?: GeoCoordinates[]; // NEW PROP
  regionName?: string;
}

export function MapLocationPicker({
  initialPosition,
  onLocationSelect,
  open,
  onClose,
  regionBoundary,
  regionName
}: MapLocationPickerProps) {
  // Default to Abo Hommos, Egypt area if no initial position
  const defaultPosition: GeoCoordinates = {
    lat: 31.0603,
    lng: 30.3254,
  };

  const [position, setPosition] = useState<GeoCoordinates>(
    initialPosition || defaultPosition
  );
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isInsideBoundary, setIsInsideBoundary] = useState(true);

  // Check boundary on position change
  useEffect(() => {
    if (regionBoundary && regionBoundary.length >= 3) {
        const isInside = isPointInPolygon(position, regionBoundary);
        setIsInsideBoundary(isInside);
    } else {
        setIsInsideBoundary(true); // No boundary = always allowed
    }
  }, [position, regionBoundary]);

  // Get user's location on mount if no initial position
  useEffect(() => {
    if (open && !hasInitialized && !initialPosition) {
      if (!isGettingLocation) { // Prevent double call
          // Only auto-locate if we don't have a specific initial position provided
          // (or if we want to auto-locate on fresh open)
          // For now, let's respect if initialPosition was passed (editing), otherwise locate.
          // BUT: If a boundary exists, we might want to center ON THE BOUNDARY instead of user's random location?
          // Let's stick to current behavior: locate user.
           getCurrentLocation();
           setHasInitialized(true);
      }
    }
  }, [open, hasInitialized, initialPosition]);


  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("متصفحك لا يدعم خدمات تحديد الموقع");
      notify.error("متصفحك لا يدعم خدمات تحديد الموقع");
      return;
    }

    setIsGettingLocation(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPosition(newPosition);
        setIsGettingLocation(false);
        notify.success("تم تحديد موقعك بنجاح");
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "فشل تحديد الموقع";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "تم رفض إذن تحديد الموقع";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "خدمة الموقع غير متاحة";
            break;
          case error.TIMEOUT:
            errorMessage = "انتهى وقت محاولة تحديد الموقع";
            break;
        }
        setGpsError(errorMessage);
        notify.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }, []);

  const handlePositionChange = useCallback((newPos: GeoCoordinates) => {
    setPosition(newPos);
  }, []);

  const handleConfirm = () => {
    if (!isInsideBoundary) {
        notify.error(`عفواً، الموقع المحدد خارج نطاق ${regionName || 'المنطقة'}`);
        return;
    }
    onLocationSelect(position);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            تحديد الموقع على الخريطة
            {regionName && <span className="text-sm font-normal text-muted-foreground">({regionName})</span>}
          </DialogTitle>
          <DialogDescription className="hidden">
            قم بتحديد موقع التوصيل بدقة على الخريطة
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* GPS Error Message */}
          {gpsError && (
            <div className="absolute top-2 left-2 right-2 z-[1000] bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <MapPinOff className="w-4 h-4" />
              {gpsError}
            </div>
          )}
          
          {/* Boundary Error Message */}
          {!isInsideBoundary && (
            <div className="absolute top-12 left-2 right-2 z-[1000] bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-4">
              <Ban className="w-4 h-4" />
              عفواً، الموقع خارج نطاق التوصيل المحدد
            </div>
          )}

          {/* Map Container */}
          <div className="h-[50vh] md:h-[400px] w-full relative bg-muted">
            <MapContainer
              center={[position.lat, position.lng]}
              zoom={15}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Boundary Visuals - Rendered AFTER tiles so they are visible */}
              {regionBoundary && (
                  <>
                    <BoundaryMask boundary={regionBoundary} />
                    <BoundaryBorder boundary={regionBoundary} />
                  </>
              )}

              <DraggableMarker
                position={position}
                onPositionChange={handlePositionChange}
              />
              <MapClickHandler onMapClick={handlePositionChange} />
              
              {/* Only Recenter on mount or initial load, not every render to avoid fighting user */}
              <CenterMapOnPosition position={position} />
              <FitBoundsToRegion boundary={regionBoundary} />
              
              <ZoomControls />
            </MapContainer>

            {/* Crosshair overlay for center indicator */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[500]">
              <div className={cn(
                  "w-6 h-6 border-2 rounded-full transition-colors duration-300",
                  isInsideBoundary ? "border-primary/50 bg-primary/10" : "border-destructive/50 bg-destructive/10"
              )} />
            </div>
          </div>

          {/* Controls overlay */}
          <div className="absolute bottom-4 right-3 z-[1000]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="shadow-lg"
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4 ml-2" />
              )}
              {isGettingLocation ? "جاري التحديد..." : "موقعي الحالي"}
            </Button>
          </div>
        </div>

        {/* Coordinates Display */}
        <div
          className={cn(
              "px-4 py-2 text-sm text-center transition-colors duration-300",
              isInsideBoundary ? "bg-muted/50 text-muted-foreground" : "bg-destructive/10 text-destructive font-medium"
          )}
          dir="ltr"
        >
          {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </div>

        {/* Instructions */}
        <div className="px-4 py-2 text-sm text-muted-foreground text-center border-t">
            {isInsideBoundary ? "اسحب العلامة الحمراء لتحديد موقعك بدقة" : "يرجى تحريك العلامة إلى المنطقة المضيئة (المسموح التوصيل لها)"}
        </div>

        <DialogFooter className="p-4 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!isInsideBoundary}>
            <Check className="w-4 h-4 ml-2" />
            تأكيد الموقع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simplified inline map component for displaying selected location
export function LocationPreviewMap({
  position,
  className,
}: {
  position: GeoCoordinates;
  className?: string;
}) {
  return (
    <div className={cn("h-32 w-full rounded-lg overflow-hidden", className)}>
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[position.lat, position.lng]}
          icon={customMarkerIcon}
        />
      </MapContainer>
    </div>
  );
}
