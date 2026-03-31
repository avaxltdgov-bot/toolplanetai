import { useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function MergePDF() {
  const [files, setFiles] = useState([]);

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Upload at least 2 PDFs");
      return;
    }

    const mergedPdf = await PDFDocument.create();

    for (let file of files) {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((p) => mergedPdf.addPage(p));
    }

    const finalPdf = await mergedPdf.save();
    const blob = new Blob([finalPdf], { type: "application/pdf" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "merged.pdf";
    link.click();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Merge PDF</h2>

      <input type="file" multiple accept="application/pdf" onChange={handleFiles} />

      <br /><br />

      <button onClick={mergePDFs}>
        Merge & Download
      </button>
    </div>
  );
}
