import { jsPDF } from "jspdf";

// ==================================================
// 🔒 LAYOUT_8_PHOTOS (ESTADO CONGELADO - NO TOCAR)
// ==================================================
export const LAYOUT_8_PHOTOS = {
  MARGIN_SIDE: 6,
  MARGIN_TOP: 8,
  CONTENT_WIDTH: 198,
  cols: 4,
  rows: 2,
  gap: 0.6,
  slotHeight: 46,
  maxImgHNoComment: 44.5,
  maxImgHWithComment: 41,
  labelSize: 5.5,
  commentSize: 4.5,
  headerHeight: 22,
  patientRowHeight: 12,
  clinicalFontSize: 12
};

// ==================================================
// 🛠️ LAYOUT_12_PHOTOS (ARQUITECTURA 2 PÁGINAS)
// ==================================================
export const LAYOUT_12_PHOTOS = {
  MARGIN_SIDE: 10,
  MARGIN_TOP: 10,
  CONTENT_WIDTH: 190,
  cols: 3,
  rows: 4,
  gap: 2.5,
  slotHeight: 54, // Reducido de 62 para evitar desbordamiento en A4
  maxImgHNoComment: 52,
  maxImgHWithComment: 46,
  labelSize: 7,
  commentSize: 6,
  headerHeight: 25,
  patientRowHeight: 15,
  clinicalFontSize: 12
};

export const ReportLayout = {
  WIDTH: 210,
  HEIGHT: 297,
  getGridConfig: (photoCount: number) => {
    return photoCount > 8 ? LAYOUT_12_PHOTOS : LAYOUT_8_PHOTOS;
  },
  calculateImageFit: (imgW: number, imgH: number, boxW: number, boxH: number) => {
    if (!imgW || !imgH) return { width: boxW, height: boxH, xOff: 0, yOff: 0 };
    const ratio = imgW / imgH;
    let finalW = boxW;
    let finalH = boxW / ratio;
    if (finalH > boxH) { finalH = boxH; finalW = boxH * ratio; }
    return { width: finalW, height: finalH, xOff: (boxW - finalW) / 2, yOff: (boxH - finalH) / 2 };
  }
};

export const pdfGenerator = {
  async generateStudyReport(data: any, photos: any[]) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const primaryColor = "#007AFF";
    const darkColor = "#0f172a";
    const mediumGray = "#64748b";
    const separatorColor = "#E5E7EB";

    const photoCount = photos.length;
    const is12 = photoCount > 8;

    // --- FUNCIONES AUXILIARES ---

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "N/A";
      try {
        // Manejo robusto de fechas ISO (YYYY-MM-DD) para evitar desfases de zona horaria
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1];
          const day = parts[2].substring(0, 2);
          return `${day}/${month}/${year}`;
        }

        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) { return dateStr; }
    };

    // ==========================================
    // RENDERIZADO FORMATO 12 FOTOS (🛠️)
    // ==========================================
    if (is12) {
      const cfg = LAYOUT_12_PHOTOS;
      const margin = cfg.MARGIN_SIDE;
      const rightBound = 210 - margin;

      // --- PÁGINA 1: INFORMACIÓN CLÍNICA ---
      if (data.orgLogo || data.location?.logo) {
        try {
          const logo = data.orgLogo || data.location?.logo;
          const size = 18; // Proporción 1:1 lo suficientemente grande
          doc.setLineWidth(0); doc.setDrawColor(255, 255, 255);
          doc.addImage(logo, 'PNG', margin, 10, size, size, undefined, 'FAST');
        } catch (e) {}
      }

      // Header Médico
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(darkColor);
      let docName = (data.doctor?.nombreFull || data.doctorName || "DR. ASIGNADO").toUpperCase();
      docName = docName.replace('DR. ', '').replace('DR ', '');
      doc.text(`DR. ${docName}`, rightBound, 15, { align: 'right' });

      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(mediumGray);
      const spec = (data.doctor?.especialidad || data.specialty || "ESPECIALISTA").toUpperCase();
      doc.text(spec, rightBound, 20, { align: 'right' });
      const cp = data.doctor?.cedulaProf || "---"; const ce = data.doctor?.cedulaEsp || "---";
      doc.text(`CÉD. PROF. ${cp}  |  CÉD. ESP. ${ce}`, rightBound, 24, { align: 'right' });

      const loc = data.location?.room || data.roomName || "SALA";
      const type = data.procedureType || data.study?.type || "ESTUDIO";
      doc.setFontSize(10); doc.setTextColor(darkColor); doc.setFont("helvetica", "bold");
      doc.text(`HOSPITAL: ${loc}   •   ESTUDIOS: ${type.toUpperCase()}`, rightBound, 30, { align: 'right' });
      doc.setDrawColor(separatorColor); doc.line(margin, 35, rightBound, 35);

      // Fila Paciente
      let y = 42;
      doc.setFontSize(8); doc.setTextColor(mediumGray); doc.setFont("helvetica", "bold");
      doc.text("PACIENTE", margin, y);
      doc.text("F. NACIMIENTO", margin + 80, y);
      doc.text("EDAD", margin + 112, y);
      doc.text("SEXO", margin + 130, y);
      doc.text(rightBound, y, "FECHA ESTUDIO", { align: 'right' });

      y += 6;
      doc.setTextColor(darkColor); doc.setFontSize(11);
      doc.text(data.patientName?.toUpperCase() || "N/A", margin, y);

      doc.setFont("helvetica", "normal");
      doc.text(formatDate(data.birthDate), margin + 80, y);
      doc.text(`${data.age || '--'}`, margin + 112, y);
      doc.text(`${data.sexo?.charAt(0) || '--'}`, margin + 130, y);
      doc.text(new Date().toLocaleDateString('es-MX'), rightBound, y, { align: 'right' });
      y += 5;
      doc.setDrawColor(separatorColor); doc.line(margin, y, rightBound, y);
      y += 15;

      // Hallazgos y Diagnóstico
      doc.setFontSize(10); doc.setTextColor(primaryColor); doc.setFont("helvetica", "bold");
      doc.text("HALLAZGOS", margin, y); y += 7;
      doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(darkColor);
      const findings = doc.splitTextToSize(data.report.findings || "Sin observaciones.", cfg.CONTENT_WIDTH);

      // Control de Desbordamiento Hallazgos
      for (let i = 0; i < findings.length; i++) {
        if (y > 255) { // Límite de seguridad antes de la firma
          doc.addPage();
          y = 20; // Reiniciar Y en nueva página
          doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(darkColor);
        }
        doc.text(findings[i], margin, y, { align: 'justify' });
        y += 5.5;
      }
      y += 10;

      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFontSize(10); doc.setTextColor(primaryColor); doc.setFont("helvetica", "bold");
      doc.text("DIAGNÓSTICO FINAL", margin, y); y += 7;
      doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(darkColor);
      const diagnosis = doc.splitTextToSize(data.report.diagnosis || "Pendiente.", cfg.CONTENT_WIDTH);

      // Control de Desbordamiento Diagnóstico
      for (let i = 0; i < diagnosis.length; i++) {
        if (y > 255) {
          doc.addPage();
          y = 20;
          doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(darkColor);
        }
        doc.text(diagnosis[i], margin, y, { align: 'justify' });
        y += 5.5;
      }

      // La firma se dibuja en la página actual (donde terminó el texto)
      const sigY = 270;
      const centerX = 105;
      const signatureImg = data.signature || data.doctor?.signature;
      if (signatureImg) {
        try {
          const sigProps = doc.getImageProperties(signatureImg);
          const sigW = 45; const sigH = (sigProps.height * sigW) / sigProps.width;
          doc.addImage(signatureImg, 'PNG', centerX - (sigW / 2), sigY - sigH + 2, sigW, sigH);
        } catch (e) {}
      }
      doc.setDrawColor(separatorColor); doc.setLineWidth(0.3); doc.line(centerX - 40, sigY + 2, centerX + 40, sigY + 2);
      doc.setTextColor(darkColor); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(docName, centerX, sigY + 7, { align: 'center' });
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(mediumGray);
      doc.text(`${spec}  |  CÉD. PROF. ${cp}  |  CÉD. ESP. ${ce}`, centerX, sigY + 11, { align: 'center' });

      // --- PÁGINA 2: ANEXO FOTOGRÁFICO ---
      doc.addPage();
      // Header Pág 2
      if (data.orgLogo || data.location?.logo) {
        try {
          const logo = data.orgLogo || data.location?.logo;
          const size = 15; // 1:1 proporcional y visible para pág 2
          doc.setLineWidth(0); doc.setDrawColor(255, 255, 255);
          doc.addImage(logo, 'PNG', margin, 10, size, size, undefined, 'FAST');
        } catch (e) {}
      }
      doc.setFontSize(9); doc.setTextColor(mediumGray); doc.setFont("helvetica", "bold");
      doc.text("ANEXO FOTOGRÁFICO", rightBound, 18, { align: 'right' });
      doc.line(margin, 22, rightBound, 22);

      // Datos Paciente Pág 2
      let py = 28;
      doc.setFontSize(10); doc.setTextColor(darkColor); doc.setFont("helvetica", "bold");
      doc.text(data.patientName?.toUpperCase() || "N/A", margin, py);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(mediumGray);
      const pInfo = `FN: ${formatDate(data.birthDate)}   •   EDAD: ${data.age || '--'}   •   SEXO: ${data.sexo?.charAt(0) || '--'}   •   FECHA: ${new Date().toLocaleDateString('es-MX')}`;
      doc.text(pInfo, rightBound, py, { align: 'right' });
      doc.line(margin, py + 3, rightBound, py + 3);

      const gridTop = 38;
      const itemWidth = (cfg.CONTENT_WIDTH - (cfg.gap * (cfg.cols - 1))) / cfg.cols;

      for (let i = 0; i < photos.length; i++) {
        const row = Math.floor(i / cfg.cols); const col = i % cfg.cols;
        const xPos = margin + (col * (itemWidth + cfg.gap));
        const yPos = gridTop + (row * cfg.slotHeight);
        try {
          const hasComment = !!photos[i].comment;
          const currentMaxH = hasComment ? cfg.maxImgHWithComment : cfg.maxImgHNoComment;
          const imgProps = doc.getImageProperties(photos[i].image);
          const fit = ReportLayout.calculateImageFit(imgProps.width, imgProps.height, itemWidth, currentMaxH);
          const imgType = imgProps.fileType === 'WEBP' ? 'WEBP' : (imgProps.fileType === 'PNG' ? 'PNG' : 'JPEG');
          doc.addImage(photos[i].image, imgType, xPos + fit.xOff, yPos + fit.yOff, fit.width, fit.height, undefined, 'FAST');
          if (hasComment) {
            doc.setFontSize(cfg.commentSize); doc.setTextColor(mediumGray);
            doc.text(doc.splitTextToSize(photos[i].comment.toUpperCase(), itemWidth), xPos + (itemWidth / 2), yPos + cfg.slotHeight - 1, { align: 'center' });
          }
        } catch (e) {}
      }

      // Firma fija en Pág 2 (Anexo)
      const sigY2 = 270;
      const centerX2 = 105;
      const signatureImg2 = data.signature || data.doctor?.signature;
      if (signatureImg2) {
        try {
          const sigProps = doc.getImageProperties(signatureImg2);
          const sigW = 45; const sigH = (sigProps.height * sigW) / sigProps.width;
          doc.addImage(signatureImg2, 'PNG', centerX2 - (sigW / 2), sigY2 - sigH + 2, sigW, sigH);
        } catch (e) {}
      }
      doc.setDrawColor(separatorColor); doc.setLineWidth(0.3); doc.line(centerX2 - 40, sigY2 + 2, centerX2 + 40, sigY2 + 2);
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(docName, centerX2, sigY2 + 7, { align: 'center' });
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(mediumGray);
      doc.text(spec, centerX2, sigY2 + 11, { align: 'center' });

    } else {
      // ==========================================
      // RENDERIZADO FORMATO 8 FOTOS (🔒 BLOQUEADO)
      // ==========================================
      const cfg = LAYOUT_8_PHOTOS;
      let curY = cfg.MARGIN_TOP;

      // Header 8
      const margin = cfg.MARGIN_SIDE; const rightBound = 210 - margin;
      if (data.orgLogo || data.location?.logo) {
        try {
          const size = 18; // 1:1 proporcional y visible
          doc.setLineWidth(0); doc.setDrawColor(255, 255, 255);
          doc.addImage(data.orgLogo || data.location?.logo, 'PNG', margin, curY, size, size, undefined, 'FAST');
        } catch (e) {}
      }
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(darkColor);
      let name = (data.doctor?.nombreFull || data.doctorName || "DR. ASIGNADO").toUpperCase();
      name = name.replace('DR. ', '').replace('DR ', '');
      doc.text(`DR. ${name}`, rightBound, curY + 3, { align: 'right' });
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(mediumGray);
      const spec = (data.doctor?.especialidad || data.specialty || "ESPECIALISTA").toUpperCase();
      doc.text(spec, rightBound, curY + 7.5, { align: 'right' });
      const cp = data.doctor?.cedulaProf || "---"; const ce = data.doctor?.cedulaEsp || "---";
      doc.text(`CÉD. PROF. ${cp}  |  CÉD. ESP. ${ce}`, rightBound, curY + 11.5, { align: 'right' });
      const loc = data.location?.room || data.roomName; const type = data.procedureType || data.study?.type || "ESTUDIO";
      doc.setFontSize(8); doc.setTextColor(darkColor); doc.setFont("helvetica", "bold");
      doc.text(`HOSPITAL: ${loc}   •   PROCEDIMIENTO: ${type.toUpperCase()}`, rightBound, curY + 15.5, { align: 'right' });
      doc.setDrawColor(separatorColor); doc.line(margin, curY + cfg.headerHeight, rightBound, curY + cfg.headerHeight);
      curY += cfg.headerHeight;

      // Paciente 8
      doc.setFontSize(7.5); doc.setTextColor(mediumGray); doc.setFont("helvetica", "bold");
      doc.text("PACIENTE", margin, curY + 4);
      doc.text("F. NACIMIENTO", margin + 80, curY + 4);
      doc.text("EDAD", margin + 112, curY + 4);
      doc.text("SEXO", margin + 130, curY + 4);
      doc.text(rightBound, curY + 4, "FECHA ESTUDIO", { align: 'right' });

      doc.setTextColor(darkColor); doc.setFontSize(9.5);
      const patientName = (data.patientName?.toUpperCase() || "N/A");
      doc.text(patientName, margin, curY + 9.5);

      doc.setFont("helvetica", "normal");
      doc.text(formatDate(data.birthDate), margin + 80, curY + 9.5);
      doc.text(`${data.age || '--'}`, margin + 112, curY + 9.5);
      doc.text(`${data.sexo?.charAt(0) || '--'}`, margin + 130, curY + 9.5);
      doc.text(new Date().toLocaleDateString('es-MX'), rightBound, curY + 9.5, { align: 'right' });

      doc.line(margin, curY + cfg.patientRowHeight, rightBound, curY + cfg.patientRowHeight);
      curY += cfg.patientRowHeight;

      // Evidencia 8
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(primaryColor);
      doc.text("EVIDENCIA FOTOGRÁFICA", margin, curY + 5);
      const gridTop = curY + 7.5;
      const itemWidth = (cfg.CONTENT_WIDTH - (cfg.gap * (cfg.cols - 1))) / cfg.cols;
      for (let i = 0; i < photos.length; i++) {
        const row = Math.floor(i / cfg.cols); const col = i % cfg.cols;
        const xPos = margin + (col * (itemWidth + cfg.gap));
        const yPos = gridTop + (row * cfg.slotHeight);
        try {
          const hasComment = !!photos[i].comment;
          const currentMaxH = hasComment ? cfg.maxImgHWithComment : cfg.maxImgHNoComment;
          const imgProps = doc.getImageProperties(photos[i].image);
          const fit = ReportLayout.calculateImageFit(imgProps.width, imgProps.height, itemWidth, currentMaxH);
          const imgType = imgProps.fileType === 'WEBP' ? 'WEBP' : (imgProps.fileType === 'PNG' ? 'PNG' : 'JPEG');
          doc.addImage(photos[i].image, imgType, xPos + fit.xOff, yPos + fit.yOff, fit.width, fit.height, undefined, 'FAST');
          if (hasComment) {
            doc.setFontSize(cfg.commentSize); doc.setTextColor(mediumGray);
            doc.text(doc.splitTextToSize(photos[i].comment.toUpperCase(), itemWidth), xPos + (itemWidth / 2), yPos + cfg.slotHeight - 1, { align: 'center' });
          }
        } catch (e) {}
      }
      curY = gridTop + (Math.ceil(photoCount / cfg.cols) * cfg.slotHeight) + 5;

      // Texto 8
      doc.setFontSize(9); doc.setTextColor(primaryColor); doc.setFont("helvetica", "bold");
      doc.text("HALLAZGOS", margin, curY); curY += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(darkColor);
      const findings8 = doc.splitTextToSize(data.report.findings || "Sin observaciones.", cfg.CONTENT_WIDTH);

      for (let i = 0; i < findings8.length; i++) {
        if (curY > 255) { doc.addPage(); curY = 20; doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(darkColor); }
        doc.text(findings8[i], margin, curY, { align: 'justify' });
        curY += 5.5;
      }
      curY += 8;

      if (curY > 240) { doc.addPage(); curY = 20; }
      doc.setFontSize(9); doc.setTextColor(primaryColor); doc.setFont("helvetica", "bold");
      doc.text("DIAGNÓSTICO", margin, curY); curY += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(darkColor);
      const diag8 = doc.splitTextToSize(data.report.diagnosis || "Pendiente.", cfg.CONTENT_WIDTH);

      for (let i = 0; i < diag8.length; i++) {
        if (curY > 255) { doc.addPage(); curY = 20; doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(darkColor); }
        doc.text(diag8[i], margin, curY, { align: 'justify' });
        curY += 5.5;
      }

      // Firma 8
      const sigYStart = 270; const centerX = 105;
      const sigImg = data.signature || data.doctor?.signature;
      const specialty = (data.doctor?.especialidad || data.specialty || "ESPECIALISTA").toUpperCase();

      if (sigImg) { try { doc.addImage(sigImg, 'PNG', centerX - 20, sigYStart - 10, 40, 15); } catch (e) {} }
      doc.setDrawColor(separatorColor); doc.line(centerX - 40, sigYStart + 2, centerX + 40, sigYStart + 2);
      doc.setTextColor(darkColor); doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(name, centerX, sigYStart + 7, { align: 'center' });
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(mediumGray);
      doc.text(`${specialty}  |  CÉD. PROF. ${cp}  |  CÉD. ESP. ${ce}`, centerX, sigYStart + 11, { align: 'center' });
    }

    // Pie de página Universal
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(6); doc.setTextColor(mediumGray);
      doc.text(`Página ${i} de ${total}`, 200, 288, { align: 'right' });
    }

    return doc;
  }
};
