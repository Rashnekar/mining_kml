/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { MapFeature, KmlDocument, MapPoint, MapLine, MapPolygon } from '../types';
import { Globe, HelpCircle, Shield, RotateCw, ZoomIn, ZoomOut, Layers } from 'lucide-react';

interface Globe3DProps {
  document: KmlDocument | null;
  activeFeatureId: string | null;
  onSelectFeature: (featureId: string | null) => void;
  visibleLayers: {
    points: boolean;
    lines: boolean;
    polygons: boolean;
  };
}

export default function Globe3D({
  document,
  activeFeatureId,
  onSelectFeature,
  visibleLayers,
}: Globe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Projection / Interaction states
  const [rotation, setRotation] = useState<[number, number]>([0, -20]); // [yaw/lng, pitch/lat]
  const [scale, setScale] = useState<number>(200);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // Hover and tooltips
  const [hoveredFeature, setHoveredFeature] = useState<MapFeature | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [worldData, setWorldData] = useState<any | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  // Handle auto-rotation
  useEffect(() => {
    if (!isRotating) return;
    const timer = d3.timer(() => {
      setRotation(prev => [prev[0] + 0.25, prev[1]]);
    });
    return () => timer.stop();
  }, [isRotating]);

  // Load World Map GeoJSON for Globe backdrop
  useEffect(() => {
    // We use a high-reliability simplified world countries geojson
    const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Network response error');
        return res.json();
      })
      .then(data => {
        setWorldData(data);
      })
      .catch(err => {
        console.warn('Could not load continent outlines. Falling back to wireframe globe.', err);
      });
  }, []);

  // Handle sizing dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const size = Math.min(width, height || 600);
        setDimensions({ width: size, height: size });
        setScale(size * 0.35); // Keep globe size proportional
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Primary Canvas Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;

    // Set high-dpi display scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Setup projection
    const projection = d3.geoOrthographic()
      .scale(scale)
      .translate([width / 2, height / 2])
      .rotate(rotation)
      .clipAngle(90);

    const path = d3.geoPath(projection, ctx);
    const graticule = d3.geoGraticule();

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Draw space starfield background
    ctx.save();
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 5, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#ffffff'); // pure white
    bgGrad.addColorStop(1, '#f8fafc'); // slate-50
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Draw Globe ocean sphere base with dynamic shading for 3D sphere look
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, scale, 0, 2 * Math.PI);
    const oceanGrad = ctx.createRadialGradient(
      width / 2 - scale / 3,
      height / 2 - scale / 3,
      scale * 0.1,
      width / 2,
      height / 2,
      scale
    );
    oceanGrad.addColorStop(0, '#eff6ff'); // blue-50 for dynamic ocean shine
    oceanGrad.addColorStop(0.8, '#dbeafe'); // blue-100 for ocean body
    oceanGrad.addColorStop(1, '#bfdbfe'); // blue-200 outer shadow shading
    ctx.fillStyle = oceanGrad;
    ctx.fill();
    ctx.restore();

    // Draw Atmosphere glow outline
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, scale, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)'; // Blue atmosphere edge
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Draw Landmasses (if loaded successfully)
    if (worldData) {
      ctx.save();
      ctx.beginPath();
      path(worldData);
      ctx.fillStyle = '#ffffff'; // pristine white continents
      ctx.fill();
      ctx.strokeStyle = '#93c5fd'; // Soft blue/slate borders
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    // Draw Graticules (Grid lines)
    if (showGrid) {
      ctx.save();
      ctx.beginPath();
      path(graticule());
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)'; // faint blue grid
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    // Draw KML layers
    if (document) {
      const activeColor = '#f59e0b'; // Amber for selected features

      // 1. Draw Polygons first (at the bottom of feature stacks)
      if (visibleLayers.polygons) {
        document.features
          .filter(f => f.type === 'Polygon')
          .forEach((feat) => {
            const polygon = feat as MapPolygon;
            const geojson: any = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [polygon.coordinates.map(c => [c.lng, c.lat])]
              }
            };

            ctx.save();
            ctx.beginPath();
            path(geojson);
            
            const isSelected = activeFeatureId === polygon.id;
            const isHovered = hoveredFeature?.id === polygon.id;

            ctx.fillStyle = isSelected 
              ? 'rgba(245, 158, 11, 0.45)' 
              : isHovered 
                ? 'rgba(59, 130, 246, 0.5)' 
                : polygon.fillColor || 'rgba(59, 130, 246, 0.3)';
            ctx.fill();

            ctx.strokeStyle = isSelected 
              ? '#f59e0b' 
              : isHovered 
                ? '#60a5fa' 
                : polygon.color || '#3b82f6';
            ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.5;
            ctx.stroke();
            ctx.restore();
          });
      }

      // 2. Draw LineStrings
      if (visibleLayers.lines) {
        document.features
          .filter(f => f.type === 'LineString')
          .forEach((feat) => {
            const line = feat as MapLine;
            const geojson: any = {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: line.coordinates.map(c => [c.lng, c.lat])
              }
            };

            ctx.save();
            ctx.beginPath();
            path(geojson);

            const isSelected = activeFeatureId === line.id;
            const isHovered = hoveredFeature?.id === line.id;

            ctx.strokeStyle = isSelected 
              ? '#f59e0b' 
              : isHovered 
                ? '#60a5fa' 
                : line.color || '#10b981';
            ctx.lineWidth = isSelected || isHovered ? 4 : line.width || 2;
            ctx.stroke();
            ctx.restore();
          });
      }

      // 3. Draw Points on top
      if (visibleLayers.points) {
        document.features
          .filter(f => f.type === 'Point')
          .forEach((feat) => {
            const point = feat as MapPoint;
            
            const coord: [number, number] = [point.coordinates.lng, point.coordinates.lat];
            const projected = projection(coord);
            
            // D3 projection returns null or offscreen coordinate if clipped
            if (projected) {
              const [x, y] = projected;
              
              // Verify the point is actually on the facing hemisphere
              // In orthographic projection, points are visible if the great-circle distance 
              // from the center of projection is <= 90 degrees
              const centerLng = -rotation[0];
              const centerLat = -rotation[1];
              const distance = d3.geoDistance(coord, [centerLng, centerLat]);

              if (distance <= Math.PI / 2) {
                const isSelected = activeFeatureId === point.id;
                const isHovered = hoveredFeature?.id === point.id;

                ctx.save();
                
                // Draw glow pulse if selected or hovered
                if (isSelected || isHovered) {
                  ctx.beginPath();
                  ctx.arc(x, y, isSelected ? 14 : 10, 0, 2 * Math.PI);
                  ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)';
                  ctx.fill();
                }

                // Main Point Pin circle
                ctx.beginPath();
                ctx.arc(x, y, isSelected ? 7 : 5, 0, 2 * Math.PI);
                ctx.fillStyle = isSelected ? '#f59e0b' : isHovered ? '#60a5fa' : '#ef4444';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw tiny labels on hover
                if (isHovered) {
                  ctx.font = 'bold 11px sans-serif';
                  ctx.fillStyle = '#ffffff';
                  ctx.shadowColor = '#000000';
                  ctx.shadowBlur = 4;
                  ctx.fillText(point.name, x + 10, y + 4);
                }

                ctx.restore();
              }
            }
          });
      }
    }
  }, [dimensions, scale, rotation, document, activeFeatureId, hoveredFeature, showGrid, worldData, visibleLayers]);

  // Handle Dragging / Orbiting
  const dragStartRef = useRef<{ x: number; y: number; r: [number, number] } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsRotating(false); // Stop auto-rotation when user interacts
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    dragStartRef.current = {
      x,
      y,
      r: [...rotation] as [number, number]
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Handle Drag Rotation
    if (dragStartRef.current) {
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      
      // Scale rotation speed relative to zoom level
      const sensitivity = 150 / scale;
      
      const newYaw = dragStartRef.current.r[0] + dx * sensitivity;
      const newPitch = Math.max(-85, Math.min(85, dragStartRef.current.r[1] - dy * sensitivity));
      
      setRotation([newYaw, newPitch]);
      return;
    }

    // 2. Handle Hover Intersecting
    if (!document) return;

    const projection = d3.geoOrthographic()
      .scale(scale)
      .translate([dimensions.width / 2, dimensions.height / 2])
      .rotate(rotation)
      .clipAngle(90);

    let matchFound = false;

    // Prioritize Point hovering for accuracy
    if (visibleLayers.points) {
      const points = document.features.filter(f => f.type === 'Point') as MapPoint[];
      for (const p of points) {
        const coord: [number, number] = [p.coordinates.lng, p.coordinates.lat];
        const projected = projection(coord);
        
        if (projected) {
          const [px, py] = projected;
          const dist = Math.hypot(x - px, y - py);
          
          // Verify on front hemisphere
          const centerLng = -rotation[0];
          const centerLat = -rotation[1];
          const geoDist = d3.geoDistance(coord, [centerLng, centerLat]);

          if (dist < 10 && geoDist <= Math.PI / 2) {
            setHoveredFeature(p);
            setTooltipPos({ x: px, y: py });
            matchFound = true;
            break;
          }
        }
      }
    }

    // fallback to Lines and Polygons if no point hovered
    if (!matchFound) {
      // Clear hover
      setHoveredFeature(null);
      setTooltipPos(null);
    }
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
  };

  const handleMouseLeave = () => {
    dragStartRef.current = null;
    setHoveredFeature(null);
    setTooltipPos(null);
  };

  // Handle click selects
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredFeature) {
      onSelectFeature(hoveredFeature.id);
    } else {
      onSelectFeature(null);
    }
  };

  // Zoom control helpers
  const zoomIn = () => {
    setScale(prev => Math.min(1000, prev + 50));
    setIsRotating(false);
  };

  const zoomOut = () => {
    setScale(prev => Math.max(100, prev - 50));
    setIsRotating(false);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm" ref={containerRef}>
      
      {/* 3D Canvas stage */}
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="cursor-grab active:cursor-grabbing max-w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleCanvasClick}
      />

      {/* Control panel HUD (Overlay) */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex flex-col gap-1 bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-200/90 pointer-events-auto shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <Globe className="w-3.5 h-3.5 animate-pulse" />
            <span>3D ORBITAL GLOBE</span>
          </div>
          <span className="text-[10px] text-slate-500">Drag to rotate • Scroll to zoom</span>
        </div>

        {/* Action controls */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setIsRotating(prev => !prev)}
            title="Toggle Rotation"
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              isRotating
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white/95 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
          </button>
          
          <button
            onClick={() => setShowGrid(prev => !prev)}
            title="Toggle Grid Graticules"
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              showGrid
                ? 'bg-violet-50 border-violet-200 text-violet-600'
                : 'bg-white/95 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <div className="flex items-center bg-white/95 border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <button onClick={zoomOut} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-r border-slate-200 cursor-pointer" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={zoomIn} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3D Tooltip popup */}
      {hoveredFeature && tooltipPos && (
        <div
          className="absolute z-30 bg-white border border-slate-200 p-2.5 rounded-lg shadow-md text-xs max-w-[200px] pointer-events-none text-slate-850 transition-opacity duration-200"
          style={{
            left: `${tooltipPos.x + 12}px`,
            top: `${tooltipPos.y - 12}px`,
          }}
        >
          <div className="font-bold border-b border-slate-100 pb-1 mb-1 flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${hoveredFeature.type === 'Point' ? 'bg-rose-500' : hoveredFeature.type === 'LineString' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            <span className="truncate text-slate-800">{hoveredFeature.name}</span>
          </div>
          {hoveredFeature.description && (
            <p className="text-[11px] text-slate-500 line-clamp-2">{hoveredFeature.description}</p>
          )}
          <div className="text-[9px] text-slate-400 font-mono mt-1">
            Lat: {hoveredFeature.coordinates.lat.toFixed(4)}, Lng: {hoveredFeature.coordinates.lng.toFixed(4)}
          </div>
        </div>
      )}

      {/* Fallback Offline Banner if WorldLand fails */}
      {!worldData && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-[10px] text-amber-800 max-w-fit shadow-xs">
          <Shield className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
          <span>Offline mode active: Displaying high-precision radar mesh.</span>
        </div>
      )}
    </div>
  );
}
