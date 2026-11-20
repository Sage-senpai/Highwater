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
  // Required for the cluster-count layer's text-field below. Without it,
  // MapLibre throws "use of text-field requires a style glyphs property"
  // the moment that layer is added, inside its own render loop, which
  // silently breaks the rest of the map (confirmed live: this is why
  // markers and even tiles were rendering inconsistently). Free, keyless,
  // CORS-open glyph CDN, logged in ATTRIBUTIONS.md.
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
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
  const statusByIdRef = useRef(statusById);
  facilitiesRef.current = facilities;
  onSelectRef.current = onSelect;
  statusByIdRef.current = statusById;
  // True once the map's one-time "load" event has fired. Checking this
  // instead of map.isStyleLoaded() matters: that method can transiently
  // report false well after "load" already fired (while tiles are mid
  // fetch, in at least this MapLibre version), and both other effects
  // used to fall back to map.once("load", ...) in that case. Since "load"
  // only ever fires once, a registration made after it already fired
  // never runs: the fit or the data update was silently dropped, with no
  // error, which is why markers and the zoomed-in view only sometimes
  // showed up. This ref is the single source of truth for "is it safe to
  // touch sources and layers now", set once inside the real "load" handler.
  const loadedRef = useRef(false);

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

    // MapLibre sizes its canvas once at creation and does not notice a
    // pure-CSS resize of its container on its own. Opening the facility
    // panel shrinks this flex box (the panel is a sibling that eats some
    // of the available height), so without this the canvas kept its old,
    // taller size and visually spilled over the panel every time. A
    // ResizeObserver on the container is the standard fix: call
    // map.resize() whenever the box actually changes size.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    map.on("load", () => {
      (["NORMAL", "WATCH", "WARNING", "SEVERE", "NO_SIGNAL"] as Level[]).forEach((level) => {
        const canvas = buildMarkerIcon(level);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // map.addImage only accepts HTMLImageElement, ImageBitmap, ImageData,
        // or a {width, height, data} object. A raw HTMLCanvasElement is not
        // one of those: passing it (even via an unsafe cast) used to fail
        // silently at runtime, with no console error, and no marker ever
        // rendered. Pulling the pixels out as ImageData fixes it.
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        map.addImage(`marker-${level}`, imageData);
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
          "text-font": ["Open Sans Regular"],
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

      // Use the refs, not the closed-over props: this handler was created
      // once, on mount, so facilities/statusById here would otherwise be
      // whatever they were at that first render, not the latest values.
      updateSource(map, facilitiesRef.current, statusByIdRef.current);
      if (facilitiesRef.current.length > 0) fitToFacilities(map, facilitiesRef.current);
      loadedRef.current = true;
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    updateSource(map, facilities, statusById);
  }, [facilities, statusById]);

  // Re-fit the view to whichever facilities are currently loaded (a state
  // switch), instead of leaving the map on its initial country-wide view,
  // which is what made the map look empty: most of the frame was ocean
  // and neighbouring countries with nothing plotted on it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || facilities.length === 0) return;
    fitToFacilities(map, facilities);
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
