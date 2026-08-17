export interface LocalPatientContext {
  id: string;
  name: string;
  path?: string;
}

export interface LocalStudyContext {
  id: string;
  type: string;
  date: string;
  path?: string;
}

export const localRecordService = {
  async ensurePatientFolder(patientName: string, birthDate: string) {
    if (!(window as any).ipcRenderer) return null;
    const result = await (window as any).ipcRenderer.invoke('ensure-patient-folder', { patientName, birthDate });
    return result.success ? result.path : null;
  },

  async ensureStudyFolder(patientPath: string, studyType: string) {
    if (!(window as any).ipcRenderer) return null;
    const result = await (window as any).ipcRenderer.invoke('ensure-study-folder', { patientPath, studyType });
    return result.success ? result.path : null;
  },

  async saveCapture(studyPath: string, index: number, base64Image: string) {
    if (!(window as any).ipcRenderer) return false;
    const fileName = `IMG_${index.toString().padStart(3, '0')}.jpg`;
    const filePath = `${studyPath}/Fotos/${fileName}`;
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const result = await (window as any).ipcRenderer.invoke('save-local-file', {
      filePath,
      base64Data: cleanBase64,
      isBuffer: true
    });
    return result.success;
  },

  async saveMetadata(studyPath: string, metadata: any) {
    if (!(window as any).ipcRenderer) return false;
    const filePath = `${studyPath}/metadata.json`;

    // Ensure medical information integrity in the local JSON
    const fullMetadata = {
      ...metadata,
      savedAt: new Date().toISOString(),
      version: "2.0.0"
    };

    const result = await (window as any).ipcRenderer.invoke('save-local-file', {
      filePath,
      base64Data: JSON.stringify(fullMetadata, null, 2)
    });
    return result.success;
  },

  async saveReportPDF(studyPath: string, pdfBlob: Blob) {
    if (!(window as any).ipcRenderer) return false;

    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(pdfBlob);
    });

    const base64Data = await base64Promise;
    const filePath = `${studyPath}/Reporte/Reporte.pdf`;

    const result = await (window as any).ipcRenderer.invoke('save-local-file', {
      filePath,
      base64Data,
      isBuffer: true
    });
    return result.success;
  },

  async saveVideo(studyPath: string, videoBlob: Blob) {
    if (!(window as any).ipcRenderer) return false;

    try {
      // OPTIMIZACIÓN CRÍTICA: Usamos ArrayBuffer en lugar de Base64 para videos largos
      // Esto evita duplicar el consumo de memoria RAM durante la transferencia a Electron
      const arrayBuffer = await videoBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const filePath = `${studyPath}/Video/Procedimiento.mp4`;

      const result = await (window as any).ipcRenderer.invoke('save-local-file', {
        filePath,
        buffer: uint8Array, // Pasamos el buffer directamente
        isBuffer: true
      });
      return result.success;
    } catch (err) {
      console.error("LocalRecordService: Error guardando video masivo:", err);
      return false;
    }
  }
};
