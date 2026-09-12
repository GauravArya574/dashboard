import React from 'react';
import { 
  Server, 
  Wifi, 
  Globe, 
  RefreshCw, 
  Settings as SettingsIcon, 
  Pause, 
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GatewayConfig, NetworkMode } from '../types';

interface NavbarProps {
  gatewayConfig: GatewayConfig;
  onOpenGatewayModal: () => void;
  onOpenSettingsModal: () => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  onSetNetworkMode: (mode: NetworkMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  gatewayConfig,
  onOpenGatewayModal,
  onOpenSettingsModal,
  onRefreshAll,
  isRefreshing,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  onSetNetworkMode,
}) => {
  const isHomeActive =
    gatewayConfig.mode === 'home' ||
    (gatewayConfig.mode === 'auto' && gatewayConfig.isHomeWifiDetected);

  // Cycle network mode on mobile single-button tap: auto -> home -> remote -> auto
  const handleCycleNetworkMode = () => {
    if (gatewayConfig.mode === 'auto') {
      onSetNetworkMode('home');
    } else if (gatewayConfig.mode === 'home') {
      onSetNetworkMode('remote');
    } else {
      onSetNetworkMode('auto');
    }
  };

  const getCycleButtonConfig = () => {
    switch (gatewayConfig.mode) {
      case 'home':
        return {
          label: 'LAN',
          title: 'Mode: LAN (Force Local). Tap to switch to WAN',
          className: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500',
        };
      case 'remote':
        return {
          label: 'WAN',
          title: 'Mode: WAN (Force Remote). Tap to switch to Auto',
          className: 'bg-sky-600 text-white shadow-sm hover:bg-sky-500',
        };
      case 'auto':
      default:
        return {
          label: 'Auto',
          title: 'Mode: Auto-detect Wi-Fi. Tap to switch to LAN',
          className: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500',
        };
    }
  };

  const cycleConfig = getCycleButtonConfig();

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
            <span
              className={`absolute -top-1 -right-1 flex h-3 w-3 ${
                isHomeActive ? 'text-emerald-400' : 'text-sky-400'
              }`}
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
            </span>
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-slate-100 tracking-tight leading-tight">
              Dashboard
            </h1>
          </div>
        </div>

        {/* Center/Right: Wi-Fi Status Indicator in Top Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Wi-Fi Status Indicator (Icon Only) */}
          <div
            id="topbar-wifi-status"
            className="flex items-center bg-slate-900/60 border border-slate-700/50 backdrop-blur-md rounded-2xl p-1 gap-1 shadow-sm shrink-0"
          >
            <button
              onClick={onOpenGatewayModal}
              title={
                isHomeActive
                  ? 'Connected: Home Wi-Fi (LAN) - Click for Diagnostics'
                  : 'Connected: Remote WAN - Click for Diagnostics'
              }
              aria-label={isHomeActive ? 'Home Wi-Fi LAN active' : 'Remote WAN active'}
              className={`flex items-center justify-center p-2 rounded-xl transition-all ${
                isHomeActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
              }`}
            >
              {isHomeActive ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <Globe className="w-4 h-4 text-sky-400" />
              )}
            </button>

            {/* Mobile Screen: 1 Single Button that cycles between options with smooth keyframe morph */}
            <div className="flex sm:hidden items-center bg-slate-950/80 rounded-xl p-0.5 border border-slate-800/60 text-[11px] overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.button
                  key={gatewayConfig.mode}
                  initial={{ opacity: 0, scale: 0.85, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 4 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleCycleNetworkMode}
                  title={cycleConfig.title}
                  className={`px-2.5 py-1 rounded-lg font-medium shadow-sm transition-transform active:scale-95 ${cycleConfig.className}`}
                >
                  {cycleConfig.label}
                </motion.button>
              </AnimatePresence>
            </div>

            {/* Tablet/Desktop Screen: 3-option segmented selector with sliding active pill */}
            <div className="hidden sm:flex items-center bg-slate-950/80 rounded-xl p-0.5 border border-slate-800/60 text-[11px] relative">
              {(
                [
                  { mode: 'auto', label: 'Auto', title: 'Auto-detect Home Wi-Fi', activeBg: 'bg-indigo-600 shadow-indigo-600/30' },
                  { mode: 'home', label: 'LAN', title: 'Force Local LAN URL', activeBg: 'bg-emerald-600 shadow-emerald-600/30' },
                  { mode: 'remote', label: 'WAN', title: 'Force Remote WAN URL', activeBg: 'bg-sky-600 shadow-sky-600/30' },
                ] as const
              ).map((tab) => {
                const isActive = gatewayConfig.mode === tab.mode;
                return (
                  <button
                    key={tab.mode}
                    onClick={() => onSetNetworkMode(tab.mode)}
                    title={tab.title}
                    className={`relative px-2.5 py-1 rounded-lg font-medium transition-colors z-10 select-none ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-network-pill"
                        className={`absolute inset-0 rounded-lg shadow-sm ${tab.activeBg}`}
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Refresh Action (No Countdown Number) */}
          <div className="flex items-center bg-slate-900/60 border border-slate-700/50 backdrop-blur-md rounded-2xl p-1 gap-0.5">
            <button
              onClick={onRefreshAll}
              disabled={isRefreshing}
              title="Refresh service status now"
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800/70 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-indigo-400 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
            </button>
            <button
              onClick={onToggleAutoRefresh}
              title={autoRefreshEnabled ? 'Pause auto status refresh' : 'Resume auto status refresh'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors hidden sm:block"
            >
              {autoRefreshEnabled ? (
                <Pause className="w-3.5 h-3.5 text-amber-400/80" />
              ) : (
                <Play className="w-3.5 h-3.5 text-slate-400" />
              )}
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
