import React, { useState } from 'react';
import { 
  X, 
  Wifi, 
  Globe, 
  Router, 
  Zap, 
  ShieldCheck, 
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { GatewayConfig, NetworkMode } from '../types';

interface GatewaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GatewayConfig;
  onSaveConfig: (newConfig: GatewayConfig) => void;
}

export const GatewaySettingsModal: React.FC<GatewaySettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<GatewayConfig>({ ...config });

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  return (
    <motion.div
      id="gateway-settings-modal"
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
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Router className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                Default Gateway & Smart Link Detection
              </h2>
              <p className="text-xs text-slate-400">
                Automatically switches service links between Local LAN and Remote WAN
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
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Routing Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'auto' })}
                className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                  formData.mode === 'auto'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Zap className="w-5 h-5 mb-1.5 text-indigo-400" />
                <span className="font-semibold text-xs text-slate-100">Auto-Detect</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'home' })}
                className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                  formData.mode === 'home'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Wifi className="w-5 h-5 mb-1.5 text-emerald-400" />
                <span className="font-semibold text-xs text-slate-100">Force Home LAN</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mode: 'remote' })}
                className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                  formData.mode === 'remote'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-200 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Globe className="w-5 h-5 mb-1.5 text-sky-400" />
                <span className="font-semibold text-xs text-slate-100">Force Remote WAN</span>
              </button>
            </div>
          </div>

          {/* Gateway Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Home Gateway IP Address
              </label>
              <input
                type="text"
                value={formData.homeGatewayIp}
                onChange={(e) => setFormData({ ...formData, homeGatewayIp: e.target.value })}
                placeholder="192.168.1.1"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:border-indigo-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Typical router gateways: <code>192.168.1.1</code>, <code>192.168.0.1</code>, <code>10.0.0.1</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Home Subnet Prefix
              </label>
              <input
                type="text"
                value={formData.homeSubnetPrefix}
                onChange={(e) => setFormData({ ...formData, homeSubnetPrefix: e.target.value })}
                placeholder="192.168.1."
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:border-indigo-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Matches local devices (e.g. <code>192.168.1.</code> or <code>10.0.</code>)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Local Probe Host URL
            </label>
            <input
              type="text"
              value={formData.probeLocalHost}
              onChange={(e) => setFormData({ ...formData, probeLocalHost: e.target.value })}
              placeholder="http://192.168.1.1"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:border-indigo-500 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              An HTTP host or router on your LAN used to test local Wi-Fi presence.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() =>
              setFormData({
                mode: 'auto',
                homeGatewayIp: '192.168.1.1',
                homeSubnetPrefix: '192.168.1.',
                probeLocalHost: 'http://192.168.1.1',
                pingIntervalSeconds: 15,
                isHomeWifiDetected: true,
                lastDetectedAt: Date.now(),
                detectionMethod: 'probe',
                autoDetectEnabled: true,
              })
            }
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
