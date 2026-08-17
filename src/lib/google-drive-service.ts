import { supabase } from './supabase';

export interface GoogleDriveStatus {
  connected: boolean;
  folderName: string;
  folderId: string;
  error?: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private rootFolderName = "LIARENA_CLOUD_SYNC";

  private async getAccessToken() {
    if (this.accessToken) return this.accessToken;

    const orgId = localStorage.getItem('liarena_org_id');
    let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    let clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    let refreshToken = import.meta.env.VITE_GOOGLE_REFRESH_TOKEN;

    // Priorizar credenciales de la DB si existen
    if (orgId) {
      const { data: org } = await supabase.from('organizations').select('google_client_id, google_client_secret, google_refresh_token').eq('id', orgId).maybeSingle();
      if (org?.google_refresh_token) {
        clientId = org.google_client_id || clientId;
        clientSecret = org.google_client_secret || clientSecret;
        refreshToken = org.google_refresh_token;
      }
    }

    if (!clientId || !clientSecret || !refreshToken || refreshToken.includes('TU_GOOGLE')) {
      throw new Error("Credenciales de Google Drive no configuradas");
    }

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const data = await response.json();
      if (data.access_token) {
        this.accessToken = data.access_token;
        // Expire token cache after 50 mins
        setTimeout(() => (this.accessToken = null), 50 * 60 * 1000);
        return this.accessToken;
      }
      throw new Error(data.error_description || "Fallo al refrescar token");
    } catch (e: any) {
      console.error("Google Auth Error:", e);
      throw e;
    }
  }

  async validateConnection(): Promise<GoogleDriveStatus> {
    try {
      const token = await this.getAccessToken();

      // Search for our root folder
      const query = `name = '${this.rootFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (data.files && data.files.length > 0) {
        return {
          connected: true,
          folderName: this.rootFolderName,
          folderId: data.files[0].id
        };
      } else {
        // Folder doesn't exist, we could create it here or just report not found
        return {
          connected: true,
          folderName: "Pendiente de crear",
          folderId: "None"
        };
      }
    } catch (e: any) {
      return {
        connected: false,
        folderName: "Desconectado",
        folderId: "None",
        error: e.message
      };
    }
  }

  async ensureRootFolder(): Promise<string | null> {
    try {
      const status = await this.validateConnection();
      if (status.connected && status.folderId !== "None") return status.folderId;

      const token = await this.getAccessToken();
      const response = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: this.rootFolderName,
          mimeType: "application/vnd.google-apps.folder",
        }),
      });

      const data = await response.json();
      return data.id || null;
    } catch (e) {
      console.error("Create Folder Error:", e);
      return null;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
