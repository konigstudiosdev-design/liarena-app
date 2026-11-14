import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge tailwind classes with clsx logic
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface DoctorNameOptions {
  uppercase?: boolean;
  defaultIfEmpty?: string;
}

/**
 * Centralized Helper to format doctor professional names with title (e.g., "Dr.", "Dra.", "Dr. A.", "Dra. B.").
 * Avoids duplicate prefixes and respects configured titles without inventing unconfigured titles.
 */
export function formatDoctorName(doctorData: any, options: DoctorNameOptions = {}): string {
  const { uppercase = false, defaultIfEmpty = "" } = options;

  if (!doctorData) {
    return uppercase ? defaultIfEmpty.toUpperCase() : defaultIfEmpty;
  }

  let rawName = "";
  let explicitTitle = "";

  if (typeof doctorData === "string") {
    rawName = doctorData.trim();
  } else if (typeof doctorData === "object") {
    const target = doctorData.doctorProfile || doctorData.doctor || doctorData.profile || doctorData;

    explicitTitle = (
      target.titulo_profesional ||
      target.titulo ||
      target.doctor_profiles?.titulo_profesional ||
      target.doctor_profiles?.[0]?.titulo_profesional ||
      ""
    ).trim();

    const nombre = (target.nombre || "").trim();
    const apellidos = (target.apellidos || "").trim();

    if (target.nombreFull || target.doctorName || target.full_name) {
      rawName = (target.nombreFull || target.doctorName || target.full_name).trim();
    } else if (nombre || apellidos) {
      rawName = `${nombre} ${apellidos}`.trim();
    } else if (target.correo || target.email) {
      rawName = target.correo || target.email;
    }
  }

  if (!rawName) {
    return uppercase ? defaultIfEmpty.toUpperCase() : defaultIfEmpty;
  }

  // Regex matching prefixes like "Dr.", "Dra.", "Dr ", "Dra ", "Dr. A.", "Dra. B.", "Doctor", "Doctora", "Médico", "Medico"
  const prefixRegex = /^\s*(Dr\.?\s*[A-Z]?\.?|Dra\.?\s*[A-Z]?\.?|Doctora?|M[eé]dico)\s+/i;
  const match = rawName.match(prefixRegex);

  let formatted = "";

  if (match) {
    formatted = rawName;
  } else if (explicitTitle) {
    const cleanTitle = explicitTitle.endsWith(".") || explicitTitle.endsWith(". ")
      ? explicitTitle.trim()
      : `${explicitTitle.trim()}.`;
    formatted = `${cleanTitle} ${rawName}`;
  } else {
    formatted = rawName;
  }

  formatted = formatted.replace(/\s+/g, " ").trim();

  return uppercase ? formatted.toUpperCase() : formatted;
}

// Ensure it's available for non-module evaluation if needed
// @ts-ignore
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.cn = cn;
  // @ts-ignore
  window.formatDoctorName = formatDoctorName;
}
