'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileArchive, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ZipUploaderProps {
  onSuccess?: (stats: { added: number; skipped: number; total: number }) => void;
}

export default function ZipUploader({ onSuccess }: ZipUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resultStats, setResultStats] = useState<{ added: number; skipped: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setStatus('error');
      setErrorMessage('Please upload a valid Instagram export archive ending with .zip');
      return;
    }
    setFile(selectedFile);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgressMessage('Extracting ZIP archive and parsing JSON files...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressTimer = setTimeout(() => {
        setStatus('processing');
        setProgressMessage('Gemini AI analyzing post captions and generating vector embeddings...');
      }, 2500);

      const response = await fetch('/api/import/export', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(progressTimer);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process Instagram ZIP archive.');
      }

      setStatus('success');
      const stats = {
        added: data.postsAdded ?? 0,
        skipped: data.postsSkipped ?? 0,
        total: data.totalFound ?? 0,
      };
      setResultStats(stats);
      if (onSuccess) onSuccess(stats);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(
        err.message || 'Could not process ZIP. Ensure you downloaded "Saved" data in JSON format from Instagram.'
      );
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-white bg-neutral-900'
            : 'border-neutral-800 hover:border-neutral-600 bg-neutral-950'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={handleChange}
          className="hidden"
        />

        {status === 'idle' && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3 text-neutral-300">
              {file ? <FileArchive className="w-6 h-6 text-white" /> : <UploadCloud className="w-6 h-6 text-neutral-400" />}
            </div>

            {file ? (
              <div>
                <span className="text-sm font-semibold text-white block">{file.name}</span>
                <span className="text-xs text-neutral-500 mt-1 block font-mono">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready
                </span>
                <p className="text-xs text-neutral-400 mt-2 hover:underline">Click to change file</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-white">
                  Drop your Instagram export <span className="font-mono text-neutral-400">.zip</span> here
                </p>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  Drag and drop your official download archive, or click to browse
                </p>
              </div>
            )}
          </div>
        )}

        {(status === 'uploading' || status === 'processing') && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
            <h4 className="text-sm font-semibold text-white mb-1">{progressMessage}</h4>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Extracting bookmarks, running AI categorization, and computing vectors.
            </p>
          </div>
        )}

        {status === 'success' && resultStats && (
          <div className="flex flex-col items-center py-2">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center mb-3 text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Import Completed</h4>
            <p className="text-xs text-neutral-400 mb-4 max-w-md">
              Processed <span className="text-white font-mono">{resultStats.total}</span> posts ({resultStats.added} added, {resultStats.skipped} skipped).
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-white text-black hover:bg-neutral-200 transition-colors"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-2">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center mb-3 text-neutral-300">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Import Error</h4>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mb-3">{errorMessage}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStatus('idle');
                setFile(null);
              }}
              className="text-xs text-neutral-300 underline hover:text-white"
            >
              Select another file
            </button>
          </div>
        )}
      </div>

      {/* Upload button */}
      {file && status === 'idle' && (
        <div className="flex justify-center">
          <button
            onClick={handleUpload}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>Process Export with AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
