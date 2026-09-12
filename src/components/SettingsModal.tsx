import React, { useRef } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  RotateCcw, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  FileJson
} from 'lucide-react';
import { motion } from 'motion/react';
import { DashboardSettings, DockerService } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DashboardSettings;
  onUpdateSettings: (newSettings: Partial<DashboardSettings>) => void;
  services: DockerService[];
  onImportServices: (importedServices: DockerService[]) => void;
  onResetDefaultServices: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  services,
  onImportServices,
  onResetDefaultServices,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      services,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homelab-docker-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.services)) {
          onImportServices(json.services);
          if (json.settings) {
            onUpdateSettings(json.settings);
          }
          alert(`Successfully imported ${json.services.length} services!`);
          onClose();
        } else if (Array.isArray(json)) {
          onImportServices(json);
          alert(`Successfully imported ${json.length} services!`);
          onClose();
        } else {
          alert('Invalid backup format. Expected a JSON file with services list.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      id="settings-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pt-16 sm:pt-20 pb-8 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                Dashboard Settings & Backup
              </h2>
              <p className="text-xs text-slate-400">
                Configure auto-refresh rates, view options, and backup homelab data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Auto Refresh Interval */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Status Auto-Refresh Interval
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 30].map((interval) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => onUpdateSettings({ refreshIntervalSeconds: interval })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    settings.refreshIntervalSeconds === interval
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {interval}s
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              How often the dashboard pings remote URLs to test availability and update the green/red dot indicators.
            </p>
          </div>

          {/* Navigation & Link Behavior */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Link & Display Preferences
            </label>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Open Service Links in New Tab
                </span>
                <span className="text-[11px] text-slate-400">
                  When clicking a service icon, open target URL in a new browser tab.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.openInNewTab}
                onChange={(e) => onUpdateSettings({ openInNewTab: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Backup & Data Management
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportJson}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export JSON Backup</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import JSON Backup</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".json"
                className="hidden"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onResetDefaultServices();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-300 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All Services (Clean Slate)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
