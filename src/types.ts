/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MapPoint {
  id: string;
  type: 'Point';
  name: string;
  description: string;
  coordinates: { lat: number; lng: number };
}

export interface MapLine {
  id: string;
  type: 'LineString';
  name: string;
  description: string;
  coordinates: { lat: number; lng: number }[];
  color?: string;
  width?: number;
}

export interface MapPolygon {
  id: string;
  type: 'Polygon';
  name: string;
  description: string;
  coordinates: { lat: number; lng: number }[];
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

export type MapFeature = MapPoint | MapLine | MapPolygon;

export interface KmlDocument {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  features: MapFeature[];
}

export interface GlobeState {
  rotation: [number, number]; // [lambda (yaw/lng), phi (pitch/lat)]
  zoom: number;
}
