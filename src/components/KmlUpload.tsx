/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { parseKml } from '../utils/kmlUtils';
import { KmlDocument } from '../types';

interface KmlUploadProps {
  onDocumentLoaded: (doc: KmlDocument) => void;
}

export default function KmlUpload({ onDocumentLoaded }: KmlUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse KML files
  const processFile = (file: File) => {
    if (!file.name.endsWith('.kml') && !file.name.endsWith('.xml')) {
      setErrorMsg('Invalid file extension. Please select a .kml file.');
      return;
    }

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        try {
          const doc = parseKml(text);
          // Overwrite the parsed document name with the file name if empty
          if (doc.name === 'Imported KML' || !doc.name) {
            doc.name = file.name.replace('.kml', '');
          }
          onDocumentLoaded(doc);
        } catch (err: any) {
          setErrorMsg(err.message || 'Error parsing KML content. Verify XML integrity.');
          setFileName(null);
        }
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the file.');
      setFileName(null);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4 text-blue-600" />
        <span>Load KML Document</span>
      </h3>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70'
            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 hover:border-slate-300'
        }`}
      >
        <input
          type="file"
          accept=".kml,.xml"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className={`p-3 rounded-xl ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
          <FileText className="w-6 h-6" />
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-700 block">
            {fileName || 'Drag & Drop your KML file here'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            or click to browse local files (.kml format)
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl text-rose-800 text-xs mt-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="leading-normal">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
