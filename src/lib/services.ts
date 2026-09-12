import { supabase, isSupabaseConfigured } from './supabase';
import { DockerService } from '../types';

export interface DatabaseServiceRow {
  id: string;
  name: string;
  icon: string;
  local_url: string;
  remote_url: string;
  health_endpoint: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Maps Supabase DB row (snake_case) to DockerService (camelCase).
 */
export function mapRowToService(row: DatabaseServiceRow): DockerService {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    localUrl: row.local_url,
    remoteUrl: row.remote_url,
    healthEndpoint: row.health_endpoint || undefined,
  };
}

/**
 * Maps DockerService (camelCase) to Supabase DB payload (snake_case).
 */
export function mapServiceToRow(service: DockerService): DatabaseServiceRow {
  return {
    id: service.id,
    name: service.name,
    icon: service.icon,
    local_url: service.localUrl,
    remote_url: service.remoteUrl,
    health_endpoint: service.healthEndpoint || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetches all services from Supabase.
 */
export async function fetchServices(): Promise<DockerService[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY) are not configured.');
  }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching services from Supabase:', error);
      const detail = error.message || error.details || error.hint || JSON.stringify(error);
      throw new Error(`Supabase Query Failed: ${detail}`);
    }

  return (data || []).map((row: DatabaseServiceRow) => mapRowToService(row));
}

/**
 * Inserts a new service into Supabase.
 */
export async function createService(service: DockerService): Promise<DockerService> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const payload = {
    id: service.id || `svc_${Date.now()}`,
    name: service.name,
    icon: service.icon,
    local_url: service.localUrl,
    remote_url: service.remoteUrl,
    health_endpoint: service.healthEndpoint || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('services')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating service in Supabase:', error);
    throw error;
  }

  return mapRowToService(data as DatabaseServiceRow);
}

/**
 * Updates an existing service row in Supabase.
 */
export async function updateService(service: DockerService): Promise<DockerService> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const payload: Partial<DatabaseServiceRow> = {
    name: service.name,
    icon: service.icon,
    local_url: service.localUrl,
    remote_url: service.remoteUrl,
    health_endpoint: service.healthEndpoint || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('services')
    .update(payload)
    .eq('id', service.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating service in Supabase:', error);
    throw error;
  }

  return mapRowToService(data as DatabaseServiceRow);
}

/**
 * Deletes a service row from Supabase.
 */
export async function deleteService(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting service from Supabase:', error);
    throw error;
  }
}

/**
 * Batch migrates or batch upserts multiple services into Supabase.
 */
export async function batchUpsertServices(servicesList: DockerService[]): Promise<DockerService[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (servicesList.length === 0) return [];

  const now = new Date().toISOString();
  const rows = servicesList.map((svc) => ({
    id: svc.id || `svc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: svc.name,
    icon: svc.icon,
    local_url: svc.localUrl,
    remote_url: svc.remoteUrl,
    health_endpoint: svc.healthEndpoint || null,
    created_at: now,
    updated_at: now,
  }));

  const { data, error } = await supabase
    .from('services')
    .upsert(rows, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error batch upserting services into Supabase:', error);
    throw error;
  }

  return (data || []).map((row: DatabaseServiceRow) => mapRowToService(row));
}

/**
 * Clears all services from Supabase.
 */
export async function clearAllServices(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('services')
    .delete()
    .neq('id', '___non_existent_id___'); // Deletes all rows

  if (error) {
    console.error('Error clearing services from Supabase:', error);
    throw error;
  }
}
