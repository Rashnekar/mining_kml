/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapFeature, MapPoint, MapLine, MapPolygon } from '../types';
import { generateId } from '../utils/kmlUtils';
import { Plus, Trash2, MapPin, Eye, FileDigit, Settings, AlertCircle, Sparkles } from 'lucide-react';

interface KmlCreatorProps {
  onAddFeature: (feature: MapFeature) => void;
}

export default function KmlCreator({ onAddFeature }: KmlCreatorProps) {
  const [featureType, setFeatureType] = useState<'Point' | 'LineString' | 'Polygon'>('Point');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [color, setColor] = useState<string>('#3b82f6'); // default blue

  // Coordinates management
  const [latInput, setLatInput] = useState<string>('');
  const [lngInput, setLngInput] = useState<string>('');
  const [coordsList, setCoordsList] = useState<{ lat: number; lng: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Add individual point to list (for Line or Polygon)
  const handleAddCoordinate = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMsg('Latitude must be a valid number between -90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setErrorMsg('Longitude must be a valid number between -180 and 180');
      return;
    }

    setCoordsList(prev => [...prev, { lat, lng }]);
    setLatInput('');
    setLngInput('');
    setErrorMsg('');
  };

  // Remove coordinate from list
  const handleRemoveCoordinate = (index: number) => {
    setCoordsList(prev => prev.filter((_, i) => i !== index));
  };

  // Submit complete feature
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please provide a name for your feature');
      return;
    }

    // Process based on type
    if (featureType === 'Point') {
      const lat = parseFloat(latInput);
      const lng = parseFloat(lngInput);

      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        setErrorMsg('Please specify a valid Latitude and Longitude coordinate');
        return;
      }

      const point: MapPoint = {
        id: generateId(),
        type: 'Point',
        name: name.trim(),
        description: description.trim(),
        coordinates: { lat, lng }
      };

      onAddFeature(point);
      resetForm();
    } else if (featureType === 'LineString') {
      if (coordsList.length < 2) {
        setErrorMsg('Paths (LineStrings) require at least 2 coordinate points');
        return;
      }

      const line: MapLine = {
        id: generateId(),
        type: 'LineString',
        name: name.trim(),
        description: description.trim(),
        coordinates: [...coordsList],
        color,
        width: 3
      };

      onAddFeature(line);
      resetForm();
    } else if (featureType === 'Polygon') {
      if (coordsList.length < 3) {
        setErrorMsg('Polygons require at least 3 vertices to define a closed area');
        return;
      }

      const polygon: MapPolygon = {
        id: generateId(),
        type: 'Polygon',
        name: name.trim(),
        description: description.trim(),
        coordinates: [...coordsList],
        color,
        fillColor: color,
        fillOpacity: 0.35
      };

      onAddFeature(polygon);
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#3b82f6');
    setLatInput('');
    setLngInput('');
    setCoordsList([]);
    setErrorMsg('');
  };

  // Auto-fill some preset coordinates for demo usability!
  const loadPreset = (presetName: string, lat: number, lng: number) => {
    setName(presetName);
    setLatInput(lat.toString());
    setLngInput(lng.toString());
  };

  const presets = [
    { name: 'Mount Everest', lat: 27.9881, lng: 86.9250 },
    { name: 'Grand Canyon', lat: 36.0544, lng: -112.1401 },
    { name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945 },
    { name: 'Great Barrier Reef', lat: -18.2871, lng: 147.6992 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-bold text-slate-800">GIS Coordinate Editor</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Feature Type */}
        <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['Point', 'LineString', 'Polygon'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setFeatureType(t);
                setErrorMsg('');
                setCoordsList([]);
              }}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                featureType === t
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t === 'Point' ? 'Point' : t === 'LineString' ? 'Line' : 'Polygon'}
            </button>
          ))}
        </div>

        {/* Feature Meta */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Feature Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Skyline Hiking Path"
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide notes or analytical metadata..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none transition resize-none"
            />
          </div>

          {/* Color Picker for Paths and Areas */}
          {featureType !== 'Point' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Visual Layer Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-700 w-24 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Single Point Coordinates */}
        {featureType === 'Point' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Point Coordinates
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Latitude (-90 to 90)</label>
                <input
                  type="text"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="e.g. 37.7749"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Longitude (-180 to 180)</label>
                <input
                  type="text"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="e.g. -122.4194"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Quick Preset Locations
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => loadPreset(p.name, p.lat, p.lng)}
                    className="bg-slate-50 hover:bg-slate-100 text-[10px] text-slate-600 px-2 py-1 rounded border border-slate-200 hover:border-slate-300 transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Path / Polygon Coordinates Editor */}
        {featureType !== 'Point' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Manage Vertices List
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="Lat (e.g. 48.85)"
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="Lng (e.g. 2.29)"
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCoordinate}
              className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vertex Point</span>
            </button>

            {/* List of current coordinates */}
            {coordsList.length > 0 ? (
              <div className="bg-slate-50 rounded-lg border border-slate-200 max-h-32 overflow-y-auto divide-y divide-slate-200">
                {coordsList.map((pt, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono">
                    <span className="text-slate-500">
                      #{index + 1}: <span className="text-slate-700">{pt.lat.toFixed(4)}</span>, <span className="text-slate-700">{pt.lng.toFixed(4)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCoordinate(index)}
                      className="text-slate-500 hover:text-rose-600 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-[11px] text-slate-400">
                No vertices added yet. At least {featureType === 'LineString' ? '2' : '3'} points needed.
              </div>
            )}
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit action */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
        >
          <MapPin className="w-4 h-4" />
          <span>Save Feature to Active Map</span>
        </button>
      </form>
    </div>
  );
}
