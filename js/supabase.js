/* ════════════════════════════════════════════════
   CybeWatch — Supabase Cloud Integration (Browser)
   Uses the Supabase CDN client (loaded from CDN in HTML or omitted for offline)
   ════════════════════════════════════════════════ */
'use strict';

window.TW = window.TW || {};

// Supabase credentials (browser-safe — these are anon/publishable keys)
const SUPABASE_URL = 'https://iydgkikooceazjgcqrxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FSo0GWXk0fn2ewwRBru2jg_hj2Xh4H9';

let supabase = null;

// Only init if the Supabase CDN client is available on the page
if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[TW] Supabase client initialized (CDN)');
  } catch(e) {
    console.warn('[TW] Supabase init failed:', e.message);
  }
} else {
  console.warn('[TW] Supabase CDN client not loaded — running in offline mode.');
}

window.SupabaseClient = supabase;

/**
 * Cloud DB Helper methods (gracefully no-op if Supabase unavailable)
 */
const CloudDB = {
  async fetchAlerts() {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('ts', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[TW Cloud] Fetch error:', e.message);
      return null;
    }
  },

  async saveAlert(alert) {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('alerts')
        .insert([alert]);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('[TW Cloud] Save error:', e.message);
      return false;
    }
  },

  async updateAlert(id, updates) {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('alerts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('[TW Cloud] Update error:', e.message);
      return false;
    }
  }
};

window.TW.cloud = CloudDB;
