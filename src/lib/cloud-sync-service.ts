import { supabase } from './supabase';

export interface SyncJob {
  id: string;
  studyId: string;
  filePath: string;
  blob: Blob;
  type: 'photo' | 'video' | 'report';
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  count: number;
  status: SyncStatus;
}

class CloudSyncService {
  private queue: SyncJob[] = [];
  private isProcessing = false;
  private status: SyncStatus = 'idle';
  private listeners: ((state: SyncState) => void)[] = [];

  subscribe(listener: (state: SyncState) => void) {
    this.listeners.push(listener);
    listener({ count: this.queue.length, status: this.status });
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l({ count: this.queue.length, status: this.status }));
  }

  async enqueue(studyId: string, blob: Blob, fileName: string, type: 'photo' | 'video' | 'report') {
    const job: SyncJob = {
      id: Math.random().toString(36).substring(7),
      studyId,
      filePath: `${studyId}/${type}/${fileName}`,
      blob,
      type
    };

    this.queue.push(job);
    this.notify();
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      if (this.queue.length === 0) {
        this.status = 'idle';
        this.notify();
      }
      return;
    }

    this.isProcessing = true;
    this.status = 'syncing';
    this.notify();

    const job = this.queue[0];

    try {
      console.log(`☁️ LIARENA Sync: Subiendo ${job.type} (${job.filePath})...`);

      const { error } = await supabase.storage
        .from('multimedia')
        .upload(job.filePath, job.blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      console.log(`✅ LIARENA Sync: ${job.type} sincronizado con éxito.`);
      this.queue.shift(); // Eliminar de la cola si tuvo éxito
      this.status = this.queue.length > 0 ? 'syncing' : 'idle';
      this.notify();
    } catch (e) {
      console.error(`❌ LIARENA Sync Error [${job.type}]:`, e);
      this.status = 'error';
      // Re-encolar al final para reintento simple
      const failedJob = this.queue.shift();
      if (failedJob) this.queue.push(failedJob);
      this.notify();

      // Esperar un poco antes de reintentar para no saturar
      await new Promise(r => setTimeout(r, 8000));
    } finally {
      this.isProcessing = false;
      // Continuar con el siguiente
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  getQueueLength() {
    return this.queue.length;
  }
}

export const cloudSyncService = new CloudSyncService();
