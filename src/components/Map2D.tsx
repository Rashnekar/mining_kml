/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { KmlDocument, MapFeature, MapPoint, MapLine, MapPolygon } from '../types';
import { Layers, Map as MapIcon, Compass } from 'lucide-react';

interface Map2DProps {
  document: KmlDocument | null;
  activeFeatureId: string | null;
  onSelectFeature: (featureId: string | null) => void;
  visibleLayers: {
    points: boolean;
    lines: boolean;
    polygons: boolean;
  };
}

type MapTheme = 'street' | 'dark' | 'satellite';

export default function Map2D({
  document,
  activeFeatureId,
  onSelectFeature,
  visibleLayers,
}: Map2DProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Layer References
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pointsGroupRef = useRef<L.LayerGroup | null>(null);
  const linesGroupRef = useRef<L.LayerGroup | null>(null);
  const polygonsGroupRef = useRef<L.LayerGroup | null>(null);
  const featureLayersMapRef = useRef<Map<string, L.Layer>>(new Map());

  const [theme, setTheme] = useState<MapTheme>('dark');

  // Tile Providers
  const tileProviders: Record<MapTheme, { url: string; attribution: string }> = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
  };

  // 1. Initialize Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
    });

    mapRef.current = map;

    // Create standard Layer Groups
    pointsGroupRef.current = L.layerGroup().addTo(map);
    linesGroupRef.current = L.layerGroup().addTo(map);
    polygonsGroupRef.current = L.layerGroup().addTo(map);

    // Apply default tile layer
    const currentProvider = tileProviders[theme];
    tileLayerRef.current = L.tileLayer(currentProvider.url, {
      attribution: currentProvider.attribution,
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Respond to Theme swaps
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;

    // Remove current tile layer
    tileLayerRef.current.remove();

    // Set new tile layer
    const provider = tileProviders[theme];
    tileLayerRef.current = L.tileLayer(provider.url, {
      attribution: provider.attribution,
    }).addTo(map);
  }, [theme]);

  // 3. Populate Map Layers when Document or Layer Toggles change
  useEffect(() => {
    const map = mapRef.current;
    const pointsGroup = pointsGroupRef.current;
    const linesGroup = linesGroupRef.current;
    const polygonsGroup = polygonsGroupRef.current;

    if (!map || !pointsGroup || !linesGroup || !polygonsGroup) return;

    // Reset previous layer maps
    pointsGroup.clearLayers();
    linesGroup.clearLayers();
    polygonsGroup.clearLayers();
    featureLayersMapRef.current.clear();

    if (!document) return;

    const bounds: L.LatLngTuple[] = [];

    document.features.forEach((feature) => {
      // 1. Render Point
      if (feature.type === 'Point' && visibleLayers.points) {
        const pt = feature as MapPoint;
        const latlng: L.LatLngTuple = [pt.coordinates.lat, pt.coordinates.lng];
        bounds.push(latlng);

        // Custom marker div to look highly modern
        const pointMarker = L.circleMarker(latlng, {
          radius: 8,
          fillColor: '#ef4444',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.9,
        });

        // Add sleek popup
        const popupContent = `
          <div class="p-1">
            <h4 class="font-bold text-slate-900 text-sm mb-0.5">${pt.name}</h4>
            ${pt.description ? `<p class="text-slate-700 text-xs mt-1 mb-1">${pt.description}</p>` : ''}
            <div class="text-[10px] text-slate-500 font-mono mt-1">
              Lat: ${pt.coordinates.lat.toFixed(5)} <br/>
              Lng: ${pt.coordinates.lng.toFixed(5)}
            </div>
          </div>
        `;
        pointMarker.bindPopup(popupContent);

        // Click selection callbacks
        pointMarker.on('click', () => {
          onSelectFeature(pt.id);
        });

        pointMarker.addTo(pointsGroup);
        featureLayersMapRef.current.set(pt.id, pointMarker);
      }

      // 2. Render LineString
      if (feature.type === 'LineString' && visibleLayers.lines) {
        const line = feature as MapLine;
        const latlngs = line.coordinates.map(c => [c.lat, c.lng] as L.LatLngTuple);
        latlngs.forEach(ll => bounds.push(ll));

        const polyline = L.polyline(latlngs, {
          color: line.color || '#10b981',
          weight: 4,
          opacity: 0.85,
        });

        const popupContent = `
          <div class="p-1">
            <h4 class="font-bold text-slate-900 text-sm mb-0.5">${line.name}</h4>
            ${line.description ? `<p class="text-slate-700 text-xs mt-1">${line.description}</p>` : ''}
            <span class="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200">
              Path Line (${line.coordinates.length} points)
            </span>
          </div>
        `;
        polyline.bindPopup(popupContent);

        polyline.on('click', () => {
          onSelectFeature(line.id);
        });

        polyline.addTo(linesGroup);
        featureLayersMapRef.current.set(line.id, polyline);
      }

      // 3. Render Polygon
      if (feature.type === 'Polygon' && visibleLayers.polygons) {
        const poly = feature as MapPolygon;
        const latlngs = poly.coordinates.map(c => [c.lat, c.lng] as L.LatLngTuple);
        latlngs.forEach(ll => bounds.push(ll));

        const polygon = L.polygon(latlngs, {
          color: poly.color || '#3b82f6',
          fillColor: poly.fillColor || poly.color || '#3b82f6',
          fillOpacity: poly.fillOpacity || 0.35,
          weight: 2,
        });

        const popupContent = `
          <div class="p-1">
            <h4 class="font-bold text-slate-900 text-sm mb-0.5">${poly.name}</h4>
            ${poly.description ? `<p class="text-slate-700 text-xs mt-1">${poly.description}</p>` : ''}
            <span class="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200">
              Polygon Area (${poly.coordinates.length} vertices)
            </span>
          </div>
        `;
        polygon.bindPopup(popupContent);

        polygon.on('click', () => {
          onSelectFeature(poly.id);
        });

        polygon.addTo(polygonsGroup);
        featureLayersMapRef.current.set(poly.id, polygon);
      }
    });

    // Fit map bounds automatically to show all features on document update!
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }, [document, visibleLayers]);

  // 4. Highlight active selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeFeatureId) return;

    const layer = featureLayersMapRef.current.get(activeFeatureId);
    if (layer) {
      // Highlight coordinates by panning to them
      if (typeof (layer as any).getLatLng === 'function') {
        const latlng = (layer as any).getLatLng();
        map.panTo(latlng);
        layer.openPopup();
      } else if (typeof (layer as any).getBounds === 'function') {
        const bounds = (layer as any).getBounds();
        map.fitBounds(bounds, { maxZoom: 16 });
        layer.openPopup();
      }
    }
  }, [activeFeatureId]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      
      {/* Map Container element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map HUD Control overlay */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        
        {/* Style selection */}
        <div className="flex bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-sm">
          {(['dark', 'street', 'satellite'] as MapTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-all ${
                theme === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5 pointer-events-none">
        <Compass className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '20s' }} />
        <span className="text-[10px] text-slate-700 font-semibold tracking-wider">LEAFLET GIS VIEW</span>
      </div>
    </div>
  );
}
