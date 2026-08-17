export interface ClinicalReportContext {
  doctor: {
    id: string;
    nombreFull: string;
    especialidad: string;
    cedulaProf: string;
    cedulaEsp: string;
    signature?: string;
  };
  patient: {
    id: string;
    nombreFull: string;
    expediente: string;
    edad: string;
    fn: string;
    sexo: string;
  };
  assistant: {
    id: string;
    nombreFull: string;
  };
  location: {
    organization: string;
    room: string;
    logo?: string;
  };
  study: {
    id: string;
    type: string;
    date: string;
    time: string;
    timestamp: string;
  };
}
