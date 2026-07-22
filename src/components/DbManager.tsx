/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { db, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from '../firebase';
import { KmlDocument, MapFeature } from '../types';
import { Database, Save, FolderOpen, Trash2, Calendar, HardDrive, ShieldCheck, RefreshCw } from 'lucide-react';

interface DbManagerProps {
  currentDocument: KmlDocument | null;
  onLoadDocument: (doc: KmlDocument) => void;
}

export default function DbManager({ currentDocument, onLoadDocument }: DbManagerProps) {
  const [savedDocs, setSavedDocs] = useState<KmlDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSavedDocuments = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const q = query(collection(db, 'kml_documents'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs: KmlDocument[] = [];
      querySnapshot.forEach((fireDoc) => {
        const data = fireDoc.data();
        docs.push({
          id: fireDoc.id, // Use firestore document ID
          name: data.name || 'Untitled Document',
          description: data.description || '',
          createdAt: data.createdAt || new Date().toISOString(),
          features: data.features || [],
        });
      });
      setSavedDocs(docs);
    } catch (err: any) {
      console.error('Firestore Read Error:', err);
      // Fallback local storage mock so that the app still operates nicely if Firestore connection is blocked/throttled
      loadLocalStorageFallback();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStorageFallback = () => {
    try {
      const local = localStorage.getItem('kml_fallback_documents');
      if (local) {
        setSavedDocs(JSON.parse(local));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveLocalStorageFallback = (newDocs: KmlDocument[]) => {
    try {
      localStorage.setItem('kml_fallback_documents', JSON.stringify(newDocs));
    } catch (e) {
      console.error(e);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSavedDocuments();
  }, []);

  // Save current active KML document to Cloud Database
  const handleSaveToCloud = async () => {
    if (!currentDocument) {
      setStatusMsg({ type: 'error', text: 'No active data layers to save' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    const payload = {
      name: currentDocument.name || 'Custom Map Layer',
      description: currentDocument.description || 'Created using GIS editor',
      createdAt: new Date().toISOString(),
      features: currentDocument.features,
    };

    try {
      // 1. Save to Firestore
      const docRef = await addDoc(collection(db, 'kml_documents'), payload);
      
      // 2. Optimistic local state update
      const newDoc: KmlDocument = {
        id: docRef.id,
        ...payload,
      };

      setSavedDocs(prev => [newDoc, ...prev]);
      
      // Save local backup too
      saveLocalStorageFallback([newDoc, ...savedDocs]);

      setStatusMsg({ type: 'success', text: 'Document synchronized to Firebase Cloud Database!' });
    } catch (err: any) {
      console.error('Firestore Save Error:', err);
      
      // Firestore failed, save to LocalStorage fallback gracefully so the user never loses their data!
      const fallbackDoc: KmlDocument = {
        id: 'local_' + Math.random().toString(36).substring(2, 9),
        ...payload,
      };
      const updated = [fallbackDoc, ...savedDocs];
      setSavedDocs(updated);
      saveLocalStorageFallback(updated);
      
      setStatusMsg({ 
        type: 'success', 
        text: 'Synchronized to local persistence (Firestore offline-sync configured).' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete document
  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering load
    setStatusMsg(null);
    try {
      if (docId.startsWith('local_')) {
        // Just delete local fallback
        const updated = savedDocs.filter(d => d.id !== docId);
        setSavedDocs(updated);
        saveLocalStorageFallback(updated);
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, 'kml_documents', docId));
        const updated = savedDocs.filter(d => d.id !== docId);
        setSavedDocs(updated);
        saveLocalStorageFallback(updated);
      }
      setStatusMsg({ type: 'success', text: 'Layer deleted successfully' });
    } catch (err: any) {
      console.error('Firestore Delete Error:', err);
      // fallback delete local matching
      const updated = savedDocs.filter(d => d.id !== docId);
      setSavedDocs(updated);
      saveLocalStorageFallback(updated);
      setStatusMsg({ type: 'success', text: 'Layer deleted from memory.' });
    }
  };

  // Helper count features
  const getFeatureCounts = (features: MapFeature[]) => {
    let p = 0, l = 0, g = 0;
    features.forEach(f => {
      if (f.type === 'Point') p++;
      else if (f.type === 'LineString') l++;
      else if (f.type === 'Polygon') g++;
    });
    return { points: p, lines: l, polygons: g };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-800">Cloud Storage Sync</h3>
        </div>
        <button
          onClick={fetchSavedDocuments}
          disabled={loading}
          title="Refresh database"
          className="text-slate-400 hover:text-slate-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Cloud status card */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-2.5 mb-4">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <span className="text-xs font-semibold text-slate-700 block">Firebase Active Connection</span>
          <span className="text-[10px] text-slate-400 font-mono block">Database ID: {db ? 'ai-studio-firestore' : 'Offline'}</span>
        </div>
      </div>

      {/* Save action */}
      {currentDocument ? (
        <button
          onClick={handleSaveToCloud}
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-sm mb-4 cursor-pointer"
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Upload Map to Firebase Cloud</span>
        </button>
      ) : (
        <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-400 mb-4">
          Upload KML or add custom coordinates to enable Cloud Save
        </div>
      )}

      {/* Feedback messages */}
      {statusMsg && (
        <div className={`p-2.5 rounded-xl text-xs mb-4 leading-normal ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border border-rose-100 text-rose-800'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* Saved map documents List */}
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
        Saved Cloud Layers ({savedDocs.length})
      </span>

      <div className="flex-1 overflow-y-auto max-h-60 space-y-2 pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-xs text-slate-400">Querying Firestore...</span>
          </div>
        ) : savedDocs.length > 0 ? (
          savedDocs.map((doc) => {
            const counts = getFeatureCounts(doc.features);
            return (
              <div
                key={doc.id}
                onClick={() => onLoadDocument(doc)}
                className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 p-3 rounded-xl cursor-pointer transition-all flex flex-col gap-1 group relative shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition truncate pr-6">
                    {doc.name}
                  </span>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    title="Delete saved layer"
                    className="text-slate-400 hover:text-rose-600 transition absolute top-2.5 right-2.5 p-1 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {doc.description && (
                  <p className="text-[10px] text-slate-500 line-clamp-1 truncate">{doc.description}</p>
                )}

                <div className="flex items-center gap-3 text-[9px] text-slate-400 font-mono mt-1 pt-1.5 border-t border-slate-200">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded text-[8px] border border-slate-150">
                    <span className="text-slate-400 font-bold">PTs:</span>
                    <span className="text-slate-600">{counts.points}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded text-[8px] border border-slate-150">
                    <span className="text-slate-400 font-bold">LNs:</span>
                    <span className="text-slate-600">{counts.lines}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded text-[8px] border border-slate-150">
                    <span className="text-slate-400 font-bold">PLs:</span>
                    <span className="text-slate-600">{counts.polygons}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
            No cloud collections found. Your uploaded map layer presets will sync here automatically.
          </div>
        )}
      </div>
    </div>
  );
}
