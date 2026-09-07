'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Settings, 
  FileJson, 
  Mail, 
  Archive, 
  UploadCloud, 
  Chrome, 
  ArrowRight, 
  Info 
} from 'lucide-react';
import ZipUploader from '@/components/ZipUploader';

export default function OnboardingPage() {
  const steps = [
    {
      number: '01',
      title: 'Open Accounts Center',
      description: 'Go to Instagram Settings → Accounts Center → Your Information and Permissions → Download Your Information.',
      icon: Settings,
    },
    {
      number: '02',
      title: 'Select Saved & JSON Format',
      description: 'Choose "Download or transfer information" → Select "Saved" data → Choose Format: JSON (Crucial) and Date range: All time.',
      icon: FileJson,
    },
    {
      number: '03',
      title: 'Wait for Download Notification',
      description: 'Instagram will compile your export archive (typically 2-15 minutes). You will receive an email once ready.',
      icon: Mail,
    },
    {
      number: '04',
      title: 'Upload Archive Below',
      description: 'Download the .zip file from Instagram and drag-and-drop the complete .zip archive below without unzipping.',
      icon: Archive,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
          Import Instagram Saved Posts
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-neutral-400 leading-relaxed">
          Follow these 4 steps to export your saved posts archive from Instagram and import it into SaveSort AI.
        </p>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono text-neutral-500">
                  STEP {step.number}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white">{step.title}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Notice Box */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3 text-xs text-neutral-300">
        <Info className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Important: </span>
          Ensure you select <strong className="text-white">JSON</strong> as the format when requesting your Instagram download. HTML exports cannot be parsed automatically.
        </div>
      </div>

      {/* Upload Drop Zone Section */}
      <div className="space-y-4 pt-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">Upload Instagram ZIP</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Our parser will extract your bookmarks and enrich them with Gemini AI
          </p>
        </div>

        <ZipUploader />
      </div>

      {/* Secondary Option: Chrome Extension */}
      <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 flex-shrink-0">
            <Chrome className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Companion Chrome Extension
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 max-w-lg">
              Want automatic syncing instead? Load our companion extension from the <code className="text-white">extension/</code> folder in this repository.
            </p>
          </div>
        </div>

        <Link
          href="/#extension"
          className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors flex items-center gap-1.5"
        >
          <span>Instructions</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
