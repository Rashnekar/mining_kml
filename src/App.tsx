/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KmlDocument, MapFeature, MapPoint, MapLine, MapPolygon } from './types';
import Globe3D from './components/Globe3D';
import Map2D from './components/Map2D';
import KmlUpload from './components/KmlUpload';
import KmlCreator from './components/KmlCreator';
import DbManager from './components/DbManager';
import { generateKmlString } from './utils/kmlUtils';
import { 
  Globe, 
  Map as MapIcon, 
  Download, 
  Layers, 
  Info, 
  Database, 
  PlusCircle, 
  FileCheck, 
  Flame, 
  Compass, 
  MapPin, 
  TrendingUp, 
  Bookmark,
  Share2
} from 'lucide-react';

// Gorgeous demo KML dataset to populate the dashboard on first load
const INITIAL_DEMO_DOCUMENT: KmlDocument = {
  id: 'demo-global-nexus',
  name: 'Global GIS Nexus',
  description: 'Global space observation centers, major trans-oceanic cables, and research area envelopes',
  createdAt: new Date().toISOString(),
  features: [
    {
      id: 'l-1',
      type: 'LineString',
      name: 'Trans-Atlantic Fiber Route',
      description: 'Submarine fiber-optic cabling connecting the UK and USA shores.',
      coordinates: [
        { lat: 50.8122, lng: -1.0772 },
        { lat: 51.5074, lng: -0.1278 },
        { lat: 40.7128, lng: -74.0060 }
      ],
      color: '#10b981',
      width: 4
    },
    {
      id: 'l-2',
      type: 'LineString',
      name: 'Pacific Ring Arc Segment',
      description: 'High activity tech tectonic fault line boundary tracking.',
      coordinates: [
        { lat: 35.6762, lng: 139.6503 },
        { lat: 5.1214, lng: 119.5885 },
        { lat: -33.8688, lng: 151.2093 }
      ],
      color: '#ef4444',
      width: 3
    },
    {
      id: 'g-1',
      type: 'Polygon',
      name: 'Bermuda Triangle Enclosure',
      description: 'Boundary zone of legendary maritime and aviation anomalies.',
      coordinates: [
        { lat: 32.3078, lng: -64.7501 }, // Bermuda
        { lat: 18.2208, lng: -66.5901 }, // Puerto Rico
        { lat: 25.7617, lng: -80.1918 }, // Miami
        { lat: 32.3078, lng: -64.7501 }  // Close path
      ],
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.3
    }
  ]
};

export default function App() {
  const [activeDoc, setActiveDoc] = useState<KmlDocument>(INITIAL_DEMO_DOCUMENT);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<'3d' | '2d'>('3d');

  // Layer Toggling States
  const [visibleLayers, setVisibleLayers] = useState({
    points: true,
    lines: true,
    polygons: true,
  });

  const [activeTab, setActiveTab] = useState<'upload' | 'create' | 'cloud'>('upload');

  // Handle addition of manually designed coordinate features
  const handleAddFeature = (feature: MapFeature) => {
    setActiveDoc(prev => ({
      ...prev,
      features: [...prev.features, feature]
    }));
    setActiveFeatureId(feature.id);
  };

  // Handle uploading parsed files
  const handleDocumentLoaded = (doc: KmlDocument) => {
    setActiveDoc(doc);
    setActiveFeatureId(null);
  };

  // Switch document (e.g. from Cloud storage loading list)
  const handleLoadDocument = (doc: KmlDocument) => {
    setActiveDoc(doc);
    setActiveFeatureId(null);
  };

  // Download active document as a valid KML File
  const handleDownloadKml = () => {
    try {
      const kmlStr = generateKmlString(activeDoc);
      const blob = new Blob([kmlStr], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Format file name
      const cleanName = activeDoc.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.download = `${cleanName || 'gis_nexus'}.kml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('KML Download failure:', e);
    }
  };

  const activeFeature = activeDoc.features.find(f => f.id === activeFeatureId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased selection:bg-blue-500/20">
      
      {/* Header Panel */}
      <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Globe className="w-4 h-4 animate-spin" style={{ animationDuration: '40s' }} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-800 uppercase flex items-center gap-1.5 leading-tight">
              <span>GeoSphere</span>
              <span className="text-blue-600 font-medium">Cloud</span>
              <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest">v1.2</span>
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wide font-medium mt-0.5">3D KML GIS Engine & Cloud Synchronization Database</p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3">
          {/* Active document tag */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-semibold text-slate-700 max-w-[150px] truncate">{activeDoc.name}</span>
          </div>

          {/* Export Map Action */}
          <button
            onClick={handleDownloadKml}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export KML</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left column: Sidebar managers (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Layer controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>GIS Layer Filters</span>
              </span>
              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {activeDoc.features.length} Features
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setVisibleLayers(prev => ({ ...prev, points: !prev.points }))}
                className={`py-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                  visibleLayers.points
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 shadow shadow-rose-500/50" />
                <span className="text-[10px] font-semibold mt-1">Points</span>
              </button>

              <button
                onClick={() => setVisibleLayers(prev => ({ ...prev, lines: !prev.lines }))}
                className={`py-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                  visibleLayers.lines
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <div className="h-1 w-4 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold mt-1">Lines</span>
              </button>

              <button
                onClick={() => setVisibleLayers(prev => ({ ...prev, polygons: !prev.polygons }))}
                className={`py-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                  visibleLayers.polygons
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <div className="w-3 h-3 border border-blue-500 bg-blue-500/20 rounded" />
                <span className="text-[10px] font-semibold mt-1">Polygons</span>
              </button>
            </div>
          </div>

          {/* Operation manager Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="flex border-b border-slate-100 bg-slate-50 p-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'upload'
                    ? 'bg-white text-blue-600 border border-slate-200/60 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Import KML
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'create'
                    ? 'bg-white text-blue-600 border border-slate-200/60 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Creator
              </button>
              <button
                onClick={() => setActiveTab('cloud')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'cloud'
                    ? 'bg-white text-blue-600 border border-slate-200/60 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cloud Database
              </button>
            </div>

            <div className="p-1">
              {activeTab === 'upload' && <KmlUpload onDocumentLoaded={handleDocumentLoaded} />}
              {activeTab === 'create' && <KmlCreator onAddFeature={handleAddFeature} />}
              {activeTab === 'cloud' && (
                <DbManager currentDocument={activeDoc} onLoadDocument={handleLoadDocument} />
              )}
            </div>
          </div>

          {/* Features Layer Table list (Retrieval and Focus selection) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex-1 flex flex-col min-h-[250px] max-h-[380px]">
            <div className="flex items-center gap-1.5 mb-3">
              <Bookmark className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Features Registry</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {activeDoc.features.length > 0 ? (
                activeDoc.features.map((f) => {
                  const isSelected = f.id === activeFeatureId;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setActiveFeatureId(f.id === activeFeatureId ? null : f.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${
                          f.type === 'Point' 
                            ? 'bg-rose-500' 
                            : f.type === 'LineString' 
                              ? 'bg-emerald-500' 
                              : 'bg-blue-500'
                        }`} />
                        <div className="truncate">
                          <span className="text-xs font-semibold block truncate leading-tight">{f.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">
                            {f.type} • {f.type === 'Point' ? '1 coordinate' : `${f.coordinates.length} pts`}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-50 group-hover:text-blue-600 group-hover:bg-blue-50 transition px-2 py-0.5 rounded-md">
                        {isSelected ? 'ACTIVE' : 'FOCUS'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  Empty map layer. Upload a KML file or add points.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: 3D Globe + 2D Interactive Map viewport (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
          
          {/* Visualization switcher */}
          <div className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 tracking-wider">ACTIVE LAYER VIEWPORT</span>
            </div>

            {/* Switch Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setVisualizationMode('3d')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                  visualizationMode === '3d'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>3D Orbital Globe</span>
              </button>
              <button
                onClick={() => setVisualizationMode('2d')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                  visualizationMode === '2d'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>2D Detailed Map</span>
              </button>
            </div>
          </div>

          {/* Interactive map staging stage */}
          <div className="relative flex-1 min-h-[480px] md:min-h-[560px] aspect-square lg:aspect-auto">
            {visualizationMode === '3d' ? (
              <Globe3D
                document={activeDoc}
                activeFeatureId={activeFeatureId}
                onSelectFeature={setActiveFeatureId}
                visibleLayers={visibleLayers}
              />
            ) : (
              <Map2D
                document={activeDoc}
                activeFeatureId={activeFeatureId}
                onSelectFeature={setActiveFeatureId}
                visibleLayers={visibleLayers}
              />
            )}
          </div>

          {/* Selected Feature Info overlay Panel */}
          {activeFeature && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    activeFeature.type === 'Point' 
                      ? 'bg-rose-500' 
                      : activeFeature.type === 'LineString' 
                        ? 'bg-emerald-500' 
                        : 'bg-blue-500'
                  }`} />
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{activeFeature.type} METADATA</span>
                </div>
                <h3 className="text-base font-bold text-slate-800">{activeFeature.name}</h3>
                {activeFeature.description ? (
                  <p className="text-xs text-slate-600 leading-relaxed">{activeFeature.description}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No description provided for this spatial feature.</p>
                )}
              </div>

              {/* Coordinates specs */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-600 w-full md:w-auto min-w-[220px]">
                <span className="text-[10px] text-slate-500 font-bold block mb-1.5 uppercase tracking-wider">Spatial coordinates:</span>
                {activeFeature.type === 'Point' ? (
                  <div className="space-y-0.5">
                    <div><span className="text-rose-600">Lat:</span> {(activeFeature as MapPoint).coordinates.lat.toFixed(6)}</div>
                    <div><span className="text-rose-600">Lng:</span> {(activeFeature as MapPoint).coordinates.lng.toFixed(6)}</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-blue-600 block font-bold">Points path list ({activeFeature.coordinates.length} items):</span>
                    <div className="max-h-24 overflow-y-auto divide-y divide-slate-200 pr-1 text-[10px]">
                      {activeFeature.coordinates.slice(0, 8).map((pt, i) => (
                        <div key={i} className="py-0.5 flex justify-between gap-4">
                           <span className="text-slate-400">#{i+1}</span>
                           <span>{pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}</span>
                        </div>
                      ))}
                      {activeFeature.coordinates.length > 8 && (
                        <div className="text-slate-400 py-0.5 text-center">... + {activeFeature.coordinates.length - 8} more points</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer credits info */}
      <footer className="border-t border-slate-200 py-4 px-6 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white mt-auto">
        <span>Terra3D Studio is powered by server-side Firebase Cloud DB.</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-700 cursor-pointer transition">Privacy Policy</span>
          <span className="hover:text-slate-700 cursor-pointer transition">GIS Terms of Use</span>
        </div>
      </footer>
    </div>
  );
}
