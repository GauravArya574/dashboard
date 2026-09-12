import React from 'react';
import { 
  Server, 
  Wifi, 
  Globe, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GatewayConfig, NetworkMode } from '../types';

interface NavbarProps {
  gatewayConfig: GatewayConfig;
  onOpenSettingsModal: () => void;
  onSetNetworkMode: (mode: NetworkMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  gatewayConfig,
  onOpenSettingsModal,
  onSetNetworkMode,
}) => {
  const isHomeActive = gatewayConfig.mode === 'home';

  // Toggle network mode directly: remote (WAN) <-> home (LAN)
  const handleToggleNetworkMode = () => {
    onSetNetworkMode(isHomeActive ? 'remote' : 'home');
  };

  return (
    <header
      id="dashboard-navbar"
      className="sticky top-0 z-40 w-full border-b border-slate-700/30 bg-slate-950/40 backdrop-blur-xl backdrop-saturate-150 px-4 sm:px-6 py-3 transition-colors duration-200 shadow-lg shadow-black/20"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-slate-700/60 shadow-inner">
            <Server className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-slate-100 tracking-tight leading-tight">
              Dashboard
            </h1>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Network Mode Switcher (Wifi/Globe Icon Button) */}
          <div
            id="topbar-wifi-status"
            className="flex items-center bg-slate-900/60 border border-slate-700/50 backdrop-blur-md rounded-2xl p-1 shadow-sm shrink-0"
          >
            <button
              onClick={handleToggleNetworkMode}
              title={
                isHomeActive
                  ? 'Network Mode: Home LAN active. Click to switch to Remote WAN (Default)'
                  : 'Network Mode: Remote WAN active (Default). Click to switch to Home LAN'
              }
              aria-label={isHomeActive ? 'Switch to Remote WAN' : 'Switch to Home LAN'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 select-none ${
                isHomeActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={gatewayConfig.mode}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 font-semibold text-xs"
                >
                  {isHomeActive ? (
                    <>
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      <span>LAN</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span>WAN</span>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>

          {/* Settings Modal */}
          <div className="flex items-center bg-slate-900/60 border border-slate-700/50 backdrop-blur-md rounded-2xl p-1">
            <button
              onClick={onOpenSettingsModal}
              title="Settings & Backup"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors"
            >
              <SettingsIcon className="w-4 h-4 text-slate-400 hover:text-slate-200" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
