import React, { useState, useEffect, useCallback } from 'react';
import { 
  FolderOpen,
  Plus,
  Wifi,
  Globe,
  GripHorizontal,
  Check
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  DockerService, 
  ServiceStatus, 
  GatewayConfig, 
  DashboardSettings, 
  NetworkMode
} from './types';
import { AnimatePresence } from 'motion/react';
import { DEFAULT_SERVICES } from './data/defaultServices';
import { performGatewayDetection, getActiveServiceUrl } from './utils/networkDetector';
import { pingService } from './utils/healthChecker';
import { Navbar } from './components/Navbar';
import { ServiceCard } from './components/ServiceCard';
import { SortableServiceCard } from './components/SortableServiceCard';
import { GatewaySettingsModal } from './components/GatewaySettingsModal';
import { ServiceModal } from './components/ServiceModal';
import { SettingsModal } from './components/SettingsModal';

const STORAGE_KEYS = {
  SERVICES: 'homelab_docker_services_clean_v3',
  SETTINGS: 'homelab_docker_settings_v2',
  GATEWAY: 'homelab_docker_gateway_v2',
};

const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  mode: 'auto',
  homeGatewayIp: '192.168.1.1',
  homeSubnetPrefix: '192.168.1.',
  probeLocalHost: 'http://192.168.1.1',
  pingIntervalSeconds: 5,
  isHomeWifiDetected: true,
  lastDetectedAt: Date.now(),
  detectionMethod: 'probe',
  autoDetectEnabled: true,
  probeLatencyMs: 14,
};

const DEFAULT_SETTINGS: DashboardSettings = {
  theme: 'dark',
  refreshIntervalSeconds: 5,
  openInNewTab: true,
  customTitle: 'Homelab Docker',
  customSubtitle: 'Self-hosted Service Directory',
  gatewayConfig: DEFAULT_GATEWAY_CONFIG,
};

export default function App() {
  // 1. Services State
  const [services, setServices] = useState<DockerService[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SERVICES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Upgrade any dark-colored icons (like vaultwarden.png) to their clear -light variants
          return parsed.map((svc: DockerService) => {
            if (
              svc.icon &&
              svc.icon.includes('/vaultwarden.png') &&
              !svc.icon.includes('vaultwarden-light.png')
            ) {
              return {
                ...svc,
                icon: svc.icon.replace('/vaultwarden.png', '/vaultwarden-light.png'),
              };
            }
            return svc;
          });
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_SERVICES;
  });

  // 2. Gateway Config State
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GATEWAY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_GATEWAY_CONFIG;
  });

  // 3. Settings State
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Guarantee 5s default interval for remote url availability pinging
          refreshIntervalSeconds: parsed.refreshIntervalSeconds || 5,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  // 4. Live Health & Refresh State
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, ServiceStatus>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // 5. Modals & Reorder Mode
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<DockerService | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);

  // DnD-Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setServices((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(items, oldIndex, newIndex);
        }
        return items;
      });
    }
  };

  // Persist Services
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    } catch {
      // ignore
    }
  }, [services]);

  // Persist Gateway Config
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GATEWAY, JSON.stringify(gatewayConfig));
    } catch {
      // ignore
    }
  }, [gatewayConfig]);

  // Persist Settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Handle Theme Sync
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Gateway Probe Routine
  const triggerGatewayDetection = useCallback(async () => {
    try {
      const detected = await performGatewayDetection(gatewayConfig);
      setGatewayConfig((prev) => ({
        ...prev,
        ...detected,
      }));
    } catch (err) {
      console.warn('Gateway detection failed:', err);
    }
  }, [gatewayConfig]);

  // Single Service Health Probe - tests availability by pinging external remote url
  const probeSingleService = useCallback(
    async (service: DockerService) => {
      setServiceStatuses((prev) => ({
        ...prev,
        [service.id]: {
          serviceId: service.id,
          state: 'checking',
          lastChecked: Date.now(),
        },
      }));

      const status = await pingService(service);

      setServiceStatuses((prev) => ({
        ...prev,
        [service.id]: status,
      }));
    },
    []
  );

  // Refresh All Services Health simultaneously
  const refreshAllStatuses = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    await Promise.all(
      services.map(async (svc) => {
        const status = await pingService(svc);
        setServiceStatuses((prev) => ({
          ...prev,
          [svc.id]: status,
        }));
      })
    );

    setIsRefreshing(false);
  }, [isRefreshing, services]);

  // Initial Boot Detection
  useEffect(() => {
    triggerGatewayDetection();
  }, []);

  // Run initial probe once services are ready or network mode changes
  useEffect(() => {
    refreshAllStatuses();
  }, [services.length, gatewayConfig.mode, gatewayConfig.isHomeWifiDetected]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      refreshAllStatuses();
    }, settings.refreshIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, settings.refreshIntervalSeconds, refreshAllStatuses]);

  // Service CRUD handlers
  const handleSaveService = (service: DockerService) => {
    setServices((prev) => {
      const index = prev.findIndex((s) => s.id === service.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = service;
        return updated;
      }
      return [...prev, service];
    });
    setTimeout(() => probeSingleService(service), 100);
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const handleOpenEditModal = (service: DockerService) => {
    setServiceToEdit(service);
    setIsServiceModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setServiceToEdit(null);
    setIsServiceModalOpen(true);
  };

  const handleSetNetworkMode = (mode: NetworkMode) => {
    setGatewayConfig((prev) => ({ ...prev, mode }));
  };

  const handleToggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings((prev) => ({ ...prev, theme: next }));
  };

  const isHomeActive =
    gatewayConfig.mode === 'home' ||
    (gatewayConfig.mode === 'auto' && gatewayConfig.isHomeWifiDetected);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Aurora Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          ref={(el) => {
            if (el && el.paused) {
              el.play().catch(() => {});
            }
          }}
          className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.75] contrast-[1.05] saturate-[1.15]"
        >
          <source src="/aurora-bg.mp4" type="video/mp4" />
        </video>
        {/* Subtle dark vignette & depth overlay for optimal contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950/70" />
        <div className="absolute inset-0 bg-slate-950/20 backdrop-brightness-90" />
      </div>

      {/* Top Bar with Wi-Fi Status Indicator */}
      <div className="relative z-40">
        <Navbar
          gatewayConfig={gatewayConfig}
          onOpenGatewayModal={() => setIsGatewayModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onRefreshAll={refreshAllStatuses}
          isRefreshing={isRefreshing}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          onSetNetworkMode={handleSetNetworkMode}
        />
      </div>

      {/* Main Content Area: Service Icons Grid (No Outer Boundary Cards, No Category Grouping, No Search) */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-start">
        {services.length === 0 ? (
          <div
            id="empty-services-state"
            className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 my-8"
          >
            <div className="p-4 rounded-2xl bg-slate-800/80 text-slate-400 mb-3">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-slate-200">No Services Configured</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              Add your first self-hosted docker service or restore presets from Settings.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Docker Service</span>
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div
              id="services-icon-launcher"
              className="w-full grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-10 justify-items-center"
            >
              <SortableContext items={services.map((s) => s.id)} strategy={rectSortingStrategy}>
                {services.map((service) => (
                  <SortableServiceCard
                    key={service.id}
                    service={service}
                    status={serviceStatuses[service.id]}
                    networkMode={gatewayConfig.mode}
                    isHomeWifiDetected={gatewayConfig.isHomeWifiDetected}
                    openInNewTab={settings.openInNewTab}
                    onEdit={handleOpenEditModal}
                    isReorderMode={isReorderMode}
                  />
                ))}
              </SortableContext>

              {/* Add Service Action */}
              <div
                id="add-service-tile"
                onClick={handleOpenAddModal}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenAddModal();
                  }
                }}
                className="group relative flex flex-col items-center justify-start cursor-pointer select-none py-2 w-full max-w-[96px] sm:max-w-[116px] md:max-w-[128px]"
                title="Add New Service"
              >
                {/* Soft glow on hover */}
                <div className="absolute inset-0 -m-3 rounded-full bg-indigo-500/0 group-hover:bg-indigo-500/20 group-hover:blur-xl transition-all duration-300 pointer-events-none opacity-0 group-hover:opacity-100" />
                <div
                  className="flex items-center justify-center w-20 h-20 xs:w-22 xs:h-22 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500/80 bg-slate-900/30 hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-400 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1.5 group-active:scale-95 group-hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] relative z-10"
                >
                  <Plus className="w-10 h-10 sm:w-12 sm:h-12 transition-transform group-hover:rotate-90 duration-300" />
                </div>
                <span className="mt-2 text-xs sm:text-sm font-medium text-slate-400 group-hover:text-indigo-300 text-center truncate w-full transition-colors tracking-tight">
                  Add
                </span>
              </div>

              {/* Drag-and-Drop Reorder Action beside the Add button */}
              <div
                id="reorder-services-tile"
                onClick={() => setIsReorderMode((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsReorderMode((prev) => !prev);
                  }
                }}
                className="group relative flex flex-col items-center justify-start cursor-pointer select-none py-2 w-full max-w-[96px] sm:max-w-[116px] md:max-w-[128px]"
                title={isReorderMode ? 'Finish Reordering' : 'Reorder Docker Services'}
              >
                {/* Soft glow on hover */}
                <div className="absolute inset-0 -m-3 rounded-full bg-indigo-500/0 group-hover:bg-indigo-500/20 group-hover:blur-xl transition-all duration-300 pointer-events-none opacity-0 group-hover:opacity-100" />
                <div
                  className={`flex items-center justify-center w-20 h-20 xs:w-22 xs:h-22 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-3xl border-2 transition-all duration-300 relative z-10 ${
                    isReorderMode
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-105'
                      : 'border-slate-800/80 bg-slate-900/30 text-slate-500 hover:text-indigo-400 hover:border-slate-700 hover:bg-slate-900/60 group-hover:scale-110 group-hover:-translate-y-1.5 group-active:scale-95 group-hover:shadow-[0_0_24px_rgba(99,102,241,0.25)]'
                  }`}
                >
                  {isReorderMode ? (
                    <Check className="w-9 h-9 sm:w-10 sm:h-10 text-white animate-scaleIn" />
                  ) : (
                    <GripHorizontal className="w-9 h-9 sm:w-10 sm:h-10 transition-transform group-hover:scale-110 duration-200" />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs sm:text-sm font-medium text-center truncate w-full transition-colors tracking-tight ${
                    isReorderMode
                      ? 'text-indigo-400 font-semibold'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {isReorderMode ? 'Done' : 'Reorder'}
                </span>
              </div>
            </div>
          </DndContext>
        )}
      </main>

      {/* Modals with AnimatePresence for smooth entry and exit transitions */}
      <AnimatePresence mode="wait">
        {isGatewayModalOpen && (
          <GatewaySettingsModal
            key="gateway-modal"
            isOpen={isGatewayModalOpen}
            onClose={() => setIsGatewayModalOpen(false)}
            config={gatewayConfig}
            onSaveConfig={(newConfig) => {
              setGatewayConfig(newConfig);
              refreshAllStatuses();
            }}
          />
        )}

        {isServiceModalOpen && (
          <ServiceModal
            key="service-modal"
            isOpen={isServiceModalOpen}
            onClose={() => {
              setIsServiceModalOpen(false);
              setServiceToEdit(null);
            }}
            onSave={handleSaveService}
            onDelete={handleDeleteService}
            serviceToEdit={serviceToEdit}
          />
        )}

        {isSettingsModalOpen && (
          <SettingsModal
            key="settings-modal"
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
            services={services}
            onImportServices={(imported) => {
              setServices(imported);
              refreshAllStatuses();
            }}
            onResetDefaultServices={() => {
              setServices(DEFAULT_SERVICES);
              refreshAllStatuses();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
