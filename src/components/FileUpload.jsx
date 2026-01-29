import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeData } from '../utils/dataNormalization';

export function FileUpload({ onDataLoaded, sheetName, allowedSheetNames = ["DMO-Obras"], compactMode = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file) => {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      setError("Por favor, sube un archivo Excel válido (.xlsx, .xls) o CSV.");
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Find if any of the allowed sheets exist in the workbook
        const foundSheet = allowedSheetNames.find(name => workbook.SheetNames.includes(name));

        // If strict matching is required we could fail here, but usually fallback to first sheet is nice
        const targetSheetName = foundSheet || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[targetSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setError("El archivo parece estar vacío o no tiene datos legibles.");
        } else {
          // Apply normalization
          const cleanedData = normalizeData(jsonData);
          onDataLoaded(cleanedData, file.name, targetSheetName);
        }
      } catch (err) {
        console.error(err);
        setError("Error al procesar el archivo. Asegúrate de que no esté dañado.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    setError(null);
    onDataLoaded(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (fileName) {
    if (compactMode) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '2rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <FileSpreadsheet size={16} className="text-green-500" />
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{fileName}</span>
          <button onClick={clearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Cerrar archivo">
            <X size={14} />
          </button>
        </div>
      )
    }

    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%' }}>
            <FileSpreadsheet className="w-8 h-8 text-green-500" style={{ color: '#10b981' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Archivo cargado con éxito</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {fileName} <span style={{ opacity: 0.5 }}>•</span> <span style={{ color: 'var(--accent-primary)' }}>{sheetName}</span>
            </p>
          </div>
        </div>
        <button
          onClick={clearFile}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="hover:bg-slate-200"
        >
          <X />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`file-upload-area ${isDragging ? 'active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        style={{ display: 'none' }}
        accept=".xlsx,.xls,.csv"
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          padding: '1.5rem',
          background: isDragging ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
          borderRadius: '50%',
          transition: 'all 0.2s'
        }}>
          <Upload size={48} color={isDragging ? '#3b82f6' : '#64748b'} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Sube tu archivo Excel
          </h3>
          <p className="text-muted">
            Arrastra y suelta tu archivo aquí, o haz clic para seleccionar
          </p>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Soporta .xlsx o .csv
          </p>
        </div>
      </div>
      {error && (
        <div style={{ marginTop: '1rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}
