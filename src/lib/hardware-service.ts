export interface ProDevice {
  id: string;
  label: string;
  brand: string;
  type: 'USB' | 'HDMI' | 'SDI' | 'VIRTUAL' | 'UNKNOWN';
  status: 'READY' | 'BUSY' | 'ERROR';
}

const BRAND_KEYWORDS: Record<string, string> = {
  'elgato': 'Elgato',
  'magewell': 'Magewell',
  'blackmagic': 'Blackmagic Design',
  'avermedia': 'AVerMedia',
  'epiphan': 'Epiphan Video',
  'olympus': 'Olympus',
  'fujifilm': 'Fujinon',
  'fujinon': 'Fujinon',
  'pentax': 'Pentax',
  'cam link': 'Elgato',
  'ultrastudio': 'Blackmagic',
  'decklink': 'Blackmagic',
  'hdmi capture': 'Generic Pro',
  'usb video': 'Generic USB'
};

export const hardwareService = {
  async getProfessionalDevices(): Promise<ProDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      const proDevices: ProDevice[] = videoDevices.map((d) => {
        const label = d.label.toLowerCase();
        let brand = 'Generic';
        let type: ProDevice['type'] = 'USB';

        // Identify Brand
        for (const [key, value] of Object.entries(BRAND_KEYWORDS)) {
          if (label.includes(key)) {
            brand = value;
            break;
          }
        }

        // Identify Connection Type
        if (label.includes('hdmi')) type = 'HDMI';
        else if (label.includes('sdi')) type = 'SDI';
        else if (label.includes('virtual') || label.includes('obs')) type = 'VIRTUAL';

        return {
          id: d.deviceId,
          label: d.label || `Video Device ${d.deviceId.slice(0,4)}`,
          brand,
          type,
          status: 'READY'
        };
      });

      return proDevices;
    } catch (e) {
      console.error("Hardware discovery error:", e);
      return [];
    }
  }
};
