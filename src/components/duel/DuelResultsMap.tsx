import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { GlobeIcon } from 'lucide-react';
import { loadGoogleMapsScript, createOptimizedMap } from '@/utils/mapUtils';

export interface ResultPin {
  lat: number;
  lng: number;
  color: string;
  label: string;
}

interface DuelResultsMapProps {
  actual: { lat: number; lng: number };
  pins: ResultPin[];
}

/** Read-only map for round results: the actual location (brand red) plus one
 *  pin per player, with geodesic lines from each guess to the answer. */
const DuelResultsMap: React.FC<DuelResultsMapProps> = ({ actual, pins }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);
  // Parents rebuild `pins`/`actual` objects on every render (e.g. each
  // countdown tick); only redraw overlays when the underlying data changes,
  // otherwise the markers flicker.
  const appliedSigRef = useRef('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        if (!mapRef.current) {
          mapRef.current = createOptimizedMap(containerRef.current, {
            center: actual,
            zoom: 4,
          });
        }
        setReady(true);
      })
      .catch((err) => console.error('Failed to load Google Maps:', err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const sig = JSON.stringify([
      actual.lat,
      actual.lng,
      pins.map((p) => [p.lat, p.lng, p.color, p.label]),
    ]);
    if (sig === appliedSigRef.current) return;
    appliedSigRef.current = sig;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(actual);

    overlaysRef.current.push(
      new google.maps.Marker({
        position: actual,
        map,
        title: 'Actual location',
        zIndex: 20,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#ea384c',
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: '#ffffff',
        },
      })
    );

    pins.forEach((pin, i) => {
      bounds.extend({ lat: pin.lat, lng: pin.lng });
      overlaysRef.current.push(
        new google.maps.Marker({
          position: { lat: pin.lat, lng: pin.lng },
          map,
          title: pin.label,
          zIndex: 10 + i,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: pin.color,
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: '#ffffff',
          },
        })
      );
      overlaysRef.current.push(
        new google.maps.Polyline({
          path: [{ lat: pin.lat, lng: pin.lng }, actual],
          geodesic: true,
          strokeColor: pin.color,
          strokeOpacity: 0.75,
          strokeWeight: 3,
          map,
        })
      );
    });

    map.fitBounds(bounds, 60);
  }, [ready, actual, pins]);

  useEffect(
    () => () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
    },
    []
  );

  return (
    <Card className="w-full h-full overflow-hidden">
      <div className="relative w-full h-full">
        <div ref={containerRef} className="w-full h-full rounded-lg" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="flex items-center space-x-2">
              <GlobeIcon className="animate-spin" />
              <span>Loading map…</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default DuelResultsMap;
