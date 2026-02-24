import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface CertificateData {
    userName: string;
    courseName: string;
    completionDate: Date;
    instructorName?: string;
}

export const generateCertificate = async ({
    userName,
    courseName,
    completionDate,
    instructorName = 'System Administrator'
}: CertificateData) => {
    // Create a landscape, A4 sized document
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // --- Background ---
    doc.setFillColor(10, 10, 10); // Cyber Black
    doc.rect(0, 0, width, height, 'F');

    // --- Borders ---
    // Outer border (Purple)
    doc.setDrawColor(189, 0, 255); // #bd00ff
    doc.setLineWidth(2);
    doc.rect(10, 10, width - 20, height - 20, 'D');

    // Inner border (Cyan)
    doc.setDrawColor(0, 240, 255); // #00f0ff
    doc.setLineWidth(1);
    doc.rect(15, 15, width - 30, height - 30, 'D');

    // --- Corner Accents ---
    doc.setDrawColor(0, 240, 255);
    doc.setLineWidth(2);
    // Top Left
    doc.line(10, 10, 30, 10);
    doc.line(10, 10, 10, 30);
    // Top Right
    doc.line(width - 10, 10, width - 30, 10);
    doc.line(width - 10, 10, width - 10, 30);
    // Bottom Left
    doc.line(10, height - 10, 30, height - 10);
    doc.line(10, height - 10, 10, height - 30);
    // Bottom Right
    doc.line(width - 10, height - 10, width - 30, height - 10);
    doc.line(width - 10, height - 10, width - 10, height - 30);

    // --- Fonts & Text ---
    // Header
    doc.setTextColor(0, 240, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("S H E R K  A C A D E M Y", width / 2, 40, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("CERTIFICATE OF COMPLETION", width / 2, 55, { align: "center", charSpace: 2 });

    // Body
    doc.setTextColor(156, 163, 175); // gray-400
    doc.setFontSize(16);
    doc.text("This certifies that the operative known as", width / 2, 85, { align: "center" });

    // User Name
    doc.setTextColor(189, 0, 255); // Purple
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.text(userName.toUpperCase(), width / 2, 110, { align: "center" });

    // Standard text
    doc.setTextColor(156, 163, 175); // gray-400
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("has successfully executed and completed all modules within the training program:", width / 2, 130, { align: "center" });

    // Course Name
    doc.setTextColor(0, 240, 255); // Cyan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    // Simple text wrapping if course name is long
    const splitCourseName = doc.splitTextToSize(courseName, width - 60);
    doc.text(splitCourseName, width / 2, 150, { align: "center" });

    // --- Footer ---
    const dateStr = completionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Left: Date
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(12);
    doc.text("DATE OF SYNCHRONIZATION", 60, height - 45, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.text(dateStr, 60, height - 35, { align: "center" });
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(30, height - 30, 90, height - 30);

    // Right: Signature
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(12);
    doc.text("SYSTEM ADMINISTRATOR", width - 60, height - 45, { align: "center" });
    doc.setTextColor(0, 240, 255);
    doc.setFont("courier", "italic"); // Cyber signature look
    doc.text(instructorName, width - 60, height - 35, { align: "center" });
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(width - 90, height - 30, width - 30, height - 30);

    // Bottom Center UUID/Hash for authenticity look
    doc.setFont("courier", "normal");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    const hash = `SYS-VAL-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`.toUpperCase();
    doc.text(`VERIFICATION HASH: ${hash}`, width / 2, height - 15, { align: "center" });

    // Check if jspdf supports charSpace, if not catch and ignore (some older types do not)

    // Download PDF
    const safeFilename = `Sherk_Academy_Certificate_${courseName.replace(/[^a-z0-9]/gi, '_').substring(0, 30).toLowerCase()}.pdf`;

    if (Capacitor.isNativePlatform()) {
        try {
            // Get base64 string from jsPDF
            const base64Data = doc.output('datauristring').split(',')[1];

            // Save to device filesystem
            const savedFile = await Filesystem.writeFile({
                path: safeFilename,
                data: base64Data,
                directory: Directory.Documents
            });

            // Trigger native share sheet / open file
            await Share.share({
                title: 'Sherk Academy Certificate',
                text: 'My Certificate of Completion',
                url: savedFile.uri,
                dialogTitle: 'Save or Share Certificate'
            });

        } catch (error) {
            console.error("Error saving certificate natively:", error);
            alert("Failed to save certificate. Make sure you have granted storage permissions.");
        }
    } else {
        // Standard Web Browser download
        doc.save(safeFilename);
    }
};
