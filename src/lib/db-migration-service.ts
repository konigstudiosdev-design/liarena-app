import { supabase } from "./supabase";

/**
 * LIARENA Database Migration System
 * Handles incremental schema updates and data integrity during app updates.
 */

interface Migration {
  version: string;
  description: string;
  run: () => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: "1.0.1",
    description: "Initial schema optimization",
    run: async () => {
      console.log("Running migration 1.0.1...");
      // Add logic here if needed for local schema or data cleanup
    }
  }
];

export const dbMigrationService = {
  async runMigrations() {
    const currentVersion = localStorage.getItem('liarena_db_version') || '1.0.0';
    console.log(`Current DB version: ${currentVersion}`);

    for (const migration of MIGRATIONS) {
      if (this.isVersionGreater(migration.version, currentVersion)) {
        try {
          console.log(`Applying migration ${migration.version}: ${migration.description}`);
          await migration.run();
          localStorage.setItem('liarena_db_version', migration.version);
          this.logMigration(migration.version, true);
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          this.logMigration(migration.version, false, String(error));
          throw error;
        }
      }
    }
  },

  isVersionGreater(v1: string, v2: string) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return true;
      if (parts1[i] < parts2[i]) return false;
    }
    return false;
  },

  async logMigration(version: string, success: boolean, error?: string) {
    // Record migration in local audit log
    const logs = JSON.parse(localStorage.getItem('liarena_update_audit') || '[]');
    logs.push({
      type: 'DB_MIGRATION',
      version,
      success,
      error,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('liarena_update_audit', JSON.stringify(logs.slice(-20))); // Keep last 20 logs
  }
};
