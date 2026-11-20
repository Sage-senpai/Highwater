import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Facility, FacilityStatus, Level } from "../types";
import { buildMarkerIcon } from "../markerIcons";

// Keyless tile source. CARTO's basemaps.cartocdn.com raster tiles now
// return a fixed "API KEY REQUIRED" placeholder image for every
// coordinate (found live on the deployed site on 2026-11-20, see
// DECISIONS.md), so this uses Esri's public World_Light_Gray_Base
// basemap instead, which still serves real tiles with no key. Terms
// and attribution text logged in ATTRIBUTIONS.md.
const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    esriGray: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "esriGray", type: "raster", source: "esriGray" }],
};

interface Props {
  facilities: Facility[];
  statusById: Record<string, FacilityStatus>;
  onSelect: (facility: Facility) => void;
}

export default function MapView({ facilities, statusById, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  // The map's click handler is registered once, on load, but facilities
  // and onSelect can change on every render (state filter, data loading).
  // Keep the latest values in refs so the handler never closes over stale
  // data instead of re-registering it.
  const facilitiesRef = useRef(facilities);
  const onSelectRef = useRef(onSelect);
  facilitiesRef.current = facilities;
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [7.5, 9.0],
      zoom: 5.2,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      (["NORMAL", "WATCH", "WARNING", "SEVERE", "NO_SIGNAL"] as Level[]).forEach((level) => {
        const canvas = buildMarkerIcon(level);
        map.addImage(`marker-${level}`, canvas as unknown as HTMLImageElement);
      });

      // Two sources: calm levels (NORMAL, NO_SIGNAL) cluster at low zoom;
      // anything WATCH or worse always renders as its own marker, never
      // folded into a cluster, so it cannot be hidden.
      map.addSource("facilities-calm", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 8,
      });
      map.addSource("facilities-attention", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "facilities-calm",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#44524F",
          "circle-opacity": 0.85,
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "facilities-calm",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#F6F4EF" },
      });
      map.addLayer({
        id: "facility-points-calm",
        type: "symbol",
        source: "facilities-calm",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["concat", "marker-", ["get", "level"]],
          "icon-size": 0.9,
          "icon-allow-overlap": true,
        },
      });
      map.addLayer({
        id: "facility-points-attention",
        type: "symbol",
        source: "facilities-attention",
        layout: {
          "icon-image": ["concat", "marker-", ["get", "level"]],
          "icon-size": 1.05,
          "icon-allow-overlap": true,
        },
      });

      const clickLayers = ["facility-points-calm", "facility-points-attention"];
      map.on("click", clickLayers, (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const facilityId = feature.properties?.id;
        const facility = facilitiesRef.current.find((f) => f.id === facilityId);
        if (facility) onSelectRef.current(facility);
      });
      for (const layer of clickLayers) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      updateSource(map, facilities, statusById);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateSource(map, facilities, statusById);
  }, [facilities, statusById]);

  // Re-fit the view to whichever facilities are currently loaded (a state
  // switch), instead of leaving the map on its initial country-wide view,
  // which is what made the map look empty: most of the frame was ocean
  // and neighbouring countries with nothing plotted on it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || facilities.length === 0) return;
    const fit = () => fitToFacilities(map, facilities);
    if (map.isStyleLoaded()) fit();
    else map.once("load", fit);
  }, [facilities]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-label="Facility map" role="region" />;
}

function fitToFacilities(map: MLMap, facilities: Facility[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const f of facilities) {
    minLat = Math.min(minLat, f.lat);
    maxLat = Math.max(maxLat, f.lat);
    minLon = Math.min(minLon, f.lon);
    maxLon = Math.max(maxLon, f.lon);
  }
  // A single facility (or several at the same point) gives a zero-size
  // bounding box, which fitBounds would zoom in on sharply. Pad it out to
  // a sane minimum instead.
  const minSpan = 0.15;
  if (maxLat - minLat < minSpan) {
    const mid = (maxLat + minLat) / 2;
    minLat = mid - minSpan / 2;
    maxLat = mid + minSpan / 2;
  }
  if (maxLon - minLon < minSpan) {
    const mid = (maxLon + minLon) / 2;
    minLon = mid - minSpan / 2;
    maxLon = mid + minSpan / 2;
  }
  map.fitBounds(
    [
      [minLon, minLat],
      [maxLon, maxLat],
    ],
    { padding: 48, maxZoom: 10, duration: 400 }
  );
}

function updateSource(map: MLMap, facilities: Facility[], statusById: Record<string, FacilityStatus>) {
  const calmSource = map.getSource("facilities-calm") as maplibregl.GeoJSONSource | undefined;
  const attentionSource = map.getSource("facilities-attention") as maplibregl.GeoJSONSource | undefined;
  if (!calmSource || !attentionSource) return;

  const calmFeatures: GeoJSON.Feature[] = [];
  const attentionFeatures: GeoJSON.Feature[] = [];

  for (const f of facilities) {
    const status = statusById[f.id];
    const level: Level = status?.level ?? "NO_SIGNAL";
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: { id: f.id, level },
      geometry: { type: "Point", coordinates: [f.lon, f.lat] },
    };
    if (level === "WATCH" || level === "WARNING" || level === "SEVERE") {
      attentionFeatures.push(feature);
    } else {
      calmFeatures.push(feature);
    }
  }

  calmSource.setData({ type: "FeatureCollection", features: calmFeatures });
  attentionSource.setData({ type: "FeatureCollection", features: attentionFeatures });
}
