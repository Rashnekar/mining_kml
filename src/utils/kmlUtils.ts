/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapFeature, MapPoint, MapLine, MapPolygon, KmlDocument } from '../types';

/**
 * Generate a random unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Clean up coordinate strings and parse them to {lat, lng} objects
 */
function parseCoordinateString(coordsStr: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  // Coordinates are usually space/newline separated blocks of "lng,lat[,alt]"
  const blocks = coordsStr.trim().split(/[\s\n\r]+/);
  
  for (const block of blocks) {
    if (!block.trim()) continue;
    const parts = block.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ lat, lng });
      }
    }
  }
  return points;
}

/**
 * Parses a KML string into a KmlDocument object
 */
export function parseKml(kmlString: string): KmlDocument {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlString, 'text/xml');
  
  // Check for parser errors
  const parserError = xmlDoc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    throw new Error('Invalid XML/KML format');
  }

  // Find Document or Folder details
  let docName = 'Imported KML';
  let docDesc = 'Imported geographical data layers';

  const docNode = xmlDoc.getElementsByTagName('Document')[0] || xmlDoc.getElementsByTagName('Folder')[0];
  if (docNode) {
    const nameNode = docNode.getElementsByTagName('name')[0];
    if (nameNode?.textContent) docName = nameNode.textContent.trim();

    const descNode = docNode.getElementsByTagName('description')[0];
    if (descNode?.textContent) docDesc = descNode.textContent.trim();
  } else {
    // Try global tags
    const globalName = xmlDoc.getElementsByTagName('name')[0];
    if (globalName?.textContent) docName = globalName.textContent.trim();
  }

  const features: MapFeature[] = [];
  const placemarks = xmlDoc.getElementsByTagName('Placemark');

  // Helper colors
  const defaultColors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
  ];

  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    
    // Get Metadata
    const name = placemark.getElementsByTagName('name')[0]?.textContent?.trim() || `Feature ${i + 1}`;
    const description = placemark.getElementsByTagName('description')[0]?.textContent?.trim() || '';
    
    // Check styled colors if any (KML usually uses aabbggrr hex format)
    let kmlColor = '';
    const styleNode = placemark.getElementsByTagName('Style')[0] || placemark.getElementsByTagName('StyleMap')[0];
    if (styleNode) {
      const colorNode = styleNode.getElementsByTagName('color')[0];
      if (colorNode?.textContent) {
        kmlColor = parseKmlColorToHex(colorNode.textContent);
      }
    }
    
    const randomColor = defaultColors[i % defaultColors.length];
    const itemColor = kmlColor || randomColor;

    // 1. Point Check
    const pointNode = placemark.getElementsByTagName('Point')[0];
    if (pointNode) {
      const coordNode = pointNode.getElementsByTagName('coordinates')[0];
      if (coordNode?.textContent) {
        const coords = parseCoordinateString(coordNode.textContent);
        if (coords.length > 0) {
          const point: MapPoint = {
            id: generateId(),
            type: 'Point',
            name,
            description,
            coordinates: coords[0]
          };
          features.push(point);
          continue;
        }
      }
    }

    // 2. LineString Check
    const lineNode = placemark.getElementsByTagName('LineString')[0];
    if (lineNode) {
      const coordNode = lineNode.getElementsByTagName('coordinates')[0];
      if (coordNode?.textContent) {
        const coords = parseCoordinateString(coordNode.textContent);
        if (coords.length > 0) {
          const line: MapLine = {
            id: generateId(),
            type: 'LineString',
            name,
            description,
            coordinates: coords,
            color: itemColor,
            width: 3
          };
          features.push(line);
          continue;
        }
      }
    }

    // 3. Polygon Check
    const polyNode = placemark.getElementsByTagName('Polygon')[0];
    if (polyNode) {
      const coordNode = polyNode.getElementsByTagName('coordinates')[0]; // Typically outerBoundaryIs
      if (coordNode?.textContent) {
        const coords = parseCoordinateString(coordNode.textContent);
        if (coords.length > 0) {
          const polygon: MapPolygon = {
            id: generateId(),
            type: 'Polygon',
            name,
            description,
            coordinates: coords,
            color: itemColor,
            fillColor: itemColor,
            fillOpacity: 0.4
          };
          features.push(polygon);
          continue;
        }
      }
    }
  }

  return {
    id: generateId(),
    name: docName,
    description: docDesc,
    createdAt: new Date().toISOString(),
    features
  };
}

/**
 * Convert KML color representation (aabbggrr hex format) to standard browser #rrggbb hex
 */
function parseKmlColorToHex(kmlColor: string): string {
  // KML colors are specified in aabbggrr format: alpha, blue, green, red
  // For example: 7fff0000 is semi-transparent blue.
  const clean = kmlColor.trim().replace('#', '');
  if (clean.length === 8) {
    // abgr -> rgb
    const r = clean.substring(6, 8);
    const g = clean.substring(4, 6);
    const b = clean.substring(2, 4);
    return `#${r}${g}${b}`;
  } else if (clean.length === 6) {
    // bgr -> rgb
    const r = clean.substring(4, 6);
    const g = clean.substring(2, 4);
    const b = clean.substring(0, 2);
    return `#${r}${g}${b}`;
  }
  return '';
}

/**
 * Converts a hex color and opacity into KML aabbggrr format
 */
export function hexToKmlColor(hex: string, opacityPercent: number = 100): string {
  const cleanHex = hex.replace('#', '');
  let r = 'ff';
  let g = 'ff';
  let b = 'ff';
  if (cleanHex.length === 6) {
    r = cleanHex.substring(0, 2);
    g = cleanHex.substring(2, 4);
    b = cleanHex.substring(4, 6);
  } else if (cleanHex.length === 3) {
    const cr = cleanHex[0];
    const cg = cleanHex[1];
    const cb = cleanHex[2];
    r = cr + cr;
    g = cg + cg;
    b = cb + cb;
  }
  
  const opacityHex = Math.round((opacityPercent / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  
  // Format is aabbggrr
  return `${opacityHex}${b}${g}${r}`;
}

/**
 * Generates a valid KML XML string from a KmlDocument representation
 */
export function generateKmlString(doc: Omit<KmlDocument, 'createdAt' | 'id'>): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<kml xmlns="http://www.opengis.net/kml/2.2">\n`;
  xml += `  <Document>\n`;
  xml += `    <name>${escapeXml(doc.name)}</name>\n`;
  xml += `    <description>${escapeXml(doc.description)}</description>\n`;

  doc.features.forEach(feature => {
    xml += `    <Placemark>\n`;
    xml += `      <name>${escapeXml(feature.name)}</name>\n`;
    xml += `      <description>${escapeXml(feature.description)}</description>\n`;

    // Define style if customized color exists
    const color = (feature as any).color || '#3B82F6';
    const kmlLineColor = hexToKmlColor(color, 100);
    const kmlFillColor = hexToKmlColor((feature as any).fillColor || color, Math.round(((feature as any).fillOpacity || 0.4) * 100));

    xml += `      <Style>\n`;
    if (feature.type === 'LineString') {
      xml += `        <LineStyle>\n`;
      xml += `          <color>${kmlLineColor}</color>\n`;
      xml += `          <width>${(feature as MapLine).width || 3}</width>\n`;
      xml += `        </LineStyle>\n`;
    } else if (feature.type === 'Polygon') {
      xml += `        <LineStyle>\n`;
      xml += `          <color>${kmlLineColor}</color>\n`;
      xml += `          <width>2</width>\n`;
      xml += `        </LineStyle>\n`;
      xml += `        <PolyStyle>\n`;
      xml += `          <color>${kmlFillColor}</color>\n`;
      xml += `          <fill>1</fill>\n`;
      xml += `          <outline>1</outline>\n`;
      xml += `        </PolyStyle>\n`;
    } else {
      // Point Style marker
      xml += `        <IconStyle>\n`;
      xml += `          <color>${kmlLineColor}</color>\n`;
      xml += `          <scale>1.1</scale>\n`;
      xml += `        </IconStyle>\n`;
    }
    xml += `      </Style>\n`;

    // Coordinates structure
    if (feature.type === 'Point') {
      xml += `      <Point>\n`;
      xml += `        <coordinates>${feature.coordinates.lng},${feature.coordinates.lat},0</coordinates>\n`;
      xml += `      </Point>\n`;
    } else if (feature.type === 'LineString') {
      xml += `      <LineString>\n`;
      xml += `        <coordinates>\n`;
      feature.coordinates.forEach(pt => {
        xml += `          ${pt.lng},${pt.lat},0\n`;
      });
      xml += `        </coordinates>\n`;
      xml += `      </LineString>\n`;
    } else if (feature.type === 'Polygon') {
      xml += `      <Polygon>\n`;
      xml += `        <outerBoundaryIs>\n`;
      xml += `          <LinearRing>\n`;
      xml += `            <coordinates>\n`;
      feature.coordinates.forEach(pt => {
        xml += `              ${pt.lng},${pt.lat},0\n`;
      });
      // KML Polygons must be closed! Ensure the last point matches the first point
      if (feature.coordinates.length > 0) {
        const first = feature.coordinates[0];
        const last = feature.coordinates[feature.coordinates.length - 1];
        if (first.lat !== last.lat || first.lng !== last.lng) {
          xml += `              ${first.lng},${first.lat},0\n`;
        }
      }
      xml += `            </coordinates>\n`;
      xml += `          </LinearRing>\n`;
      xml += `        </outerBoundaryIs>\n`;
      xml += `      </Polygon>\n`;
    }

    xml += `    </Placemark>\n`;
  });

  xml += `  </Document>\n`;
  xml += `</kml>\n`;
  return xml;
}

/**
 * Escape XML strings
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
