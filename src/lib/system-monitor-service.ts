export interface SystemStats {
  cpuUsage: number;
  memoryUsage: string;
  diskSpace: string;
  platform: string;
}

export const systemMonitorService = {
  async getStats(): Promise<SystemStats> {
    if (!(window as any).ipcRenderer) {
      return { cpuUsage: 0, memoryUsage: '0 GB', diskSpace: '0 GB', platform: 'Web' };
    }

    try {
      const stats = await (window as any).ipcRenderer.invoke('get-system-info');
      return {
        cpuUsage: stats.cpuLoad || 0,
        memoryUsage: `${stats.freeRam} / ${stats.ram}`,
        diskSpace: stats.diskSpace || 'N/A',
        platform: stats.platform
      };
    } catch (e) {
      return { cpuUsage: 0, memoryUsage: 'N/A', diskSpace: 'N/A', platform: 'N/A' };
    }
  }
};
