import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { LeaveRecord, UserSettings } from '../types';
import { LeaveTypeColors } from '../constants/theme';

export const exportService = {
  /**
   * Generates a beautifully styled HTML string for PDF reports.
   */
  generateHTMLContent: (leaves: LeaveRecord[], settings: UserSettings, year: number): string => {
    // Filter leaves for selected year
    const yearLeaves = leaves.filter((leave) => new Date(leave.date).getFullYear() === year);
    
    // Sort leaves by date ascending for the table
    const sortedLeaves = [...yearLeaves].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate statistics
    const stats = {
      Casual: 0,
      Vacation: 0,
      Duty: 0,
    };

    sortedLeaves.forEach((leave) => {
      if (stats[leave.type] !== undefined) {
        stats[leave.type] += 1;
      }
    });

    const totalTaken = sortedLeaves.length;

    const formatRow = (leave: LeaveRecord, index: number) => {
      const typeColor = LeaveTypeColors[leave.type] || '#6b7280';
      
      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="leave-title">${leave.reason}</div>
          </td>
          <td>
            <span class="badge" style="background-color: ${typeColor}15; color: ${typeColor}; border: 1px solid ${typeColor}30;">
              ${leave.type}
            </span>
          </td>
          <td>${leave.date}</td>
        </tr>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Personal Leave Tracker - ${year} Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              color: #1e293b;
              background-color: #ffffff;
              padding: 40px;
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .header-left h1 {
              font-size: 26px;
              font-weight: 700;
              margin: 0 0 6px 0;
              color: #4f46e5;
            }
            .header-left p {
              font-size: 14px;
              color: #64748b;
              margin: 0;
            }
            .header-right {
              text-align: right;
            }
            .header-right h3 {
              font-size: 18px;
              margin: 0 0 6px 0;
              color: #0f172a;
            }
            .header-right p {
              font-size: 13px;
              color: #64748b;
              margin: 0;
            }
            
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 30px;
            }
            .meta-card {
              background-color: #f8fafc;
              border-radius: 12px;
              padding: 16px;
              border: 1px solid #e2e8f0;
              text-align: center;
            }
            .meta-card .label {
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 6px;
              letter-spacing: 0.5px;
            }
            .meta-card .value {
              font-size: 24px;
              font-weight: 700;
              color: #0f172a;
            }
            .meta-card.primary {
              background-color: #4f46e508;
              border-color: #4f46e520;
            }
            .meta-card.primary .value {
              color: #4f46e5;
            }
            
            .section-title {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 16px 0;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            th {
              background-color: #f8fafc;
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
              text-align: left;
              padding: 12px 16px;
              border-bottom: 1px solid #cbd5e1;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 14px 16px;
              font-size: 13px;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: middle;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .leave-title {
              font-weight: 600;
              color: #0f172a;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 600;
              text-transform: capitalize;
            }
            
            .footer-info {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-top: 30px;
              border-top: 2px solid #f1f5f9;
            }
            .signature-block {
              width: 200px;
              text-align: center;
            }
            .signature-line {
              border-bottom: 1px solid #cbd5e1;
              margin-bottom: 8px;
              height: 40px;
            }
            .signature-label {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>Leave Report & Logs</h1>
              <p>Personalized Corporate Compliance Audit Document</p>
            </div>
            <div class="header-right">
              <h3>Employee: ${settings.userName}</h3>
              <p>Email: ${settings.email || 'N/A'}</p>
            </div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-card primary">
              <div class="label">Total Taken</div>
              <div class="value">${totalTaken} Days</div>
            </div>
            <div class="meta-card">
              <div class="label">Casual</div>
              <div class="value">${stats.Casual} Days</div>
            </div>
            <div class="meta-card">
              <div class="label">Vacation</div>
              <div class="value">${stats.Vacation} Days</div>
            </div>
            <div class="meta-card">
              <div class="label">Duty</div>
              <div class="value">${stats.Duty} Days</div>
            </div>
          </div>
          
          <h2 class="section-title">Leave History Details</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Reason / Description</th>
                <th style="width: 140px;">Leave Type</th>
                <th style="width: 140px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${sortedLeaves.length === 0 ? '<tr><td colspan="4" style="text-align: center; padding: 30px; color: #94a3b8;">No leaves logged for this calendar period.</td></tr>' : sortedLeaves.map((l, index) => formatRow(l, index)).join('')}
            </tbody>
          </table>
          
          <div class="footer-info">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-label">Employee Signature</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-label">Supervisor / HR Signature</div>
            </div>
          </div>
        </body>
      </html>
    `;
  },

  /**
   * Generates and triggers system print/save dialog for the PDF.
   */
  printPDF: async (leaves: LeaveRecord[], settings: UserSettings, year: number): Promise<void> => {
    try {
      const htmlContent = exportService.generateHTMLContent(leaves, settings, year);
      await Print.printAsync({
        html: htmlContent,
      });
    } catch (error) {
      console.error('Error printing PDF report:', error);
      throw error;
    }
  },

  /**
   * Generates a PDF file locally and shares it via the share action sheet.
   */
  exportToPDF: async (leaves: LeaveRecord[], settings: UserSettings, year: number): Promise<void> => {
    try {
      const htmlContent = exportService.generateHTMLContent(leaves, settings, year);
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });

      const destinationUri = `${FileSystem.documentDirectory}Leave_Report_${year}.pdf`;
      await FileSystem.moveAsync({
        from: uri,
        to: destinationUri,
      });

      await Sharing.shareAsync(destinationUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share PDF Report ${year}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Error exporting PDF report:', error);
      throw error;
    }
  },

  /**
   * Compiles leave data into an Excel spreadsheet (.xlsx) and triggers file share.
   */
  exportToExcel: async (leaves: LeaveRecord[], settings: UserSettings, year: number): Promise<void> => {
    try {
      // Filter logs for selected year
      const yearLeaves = leaves.filter((leave) => new Date(leave.date).getFullYear() === year);

      // Calculate statistics
      const stats = {
        Casual: 0,
        Vacation: 0,
        Duty: 0,
      };

      yearLeaves.forEach((leave) => {
        if (stats[leave.type] !== undefined) {
          stats[leave.type] += 1;
        }
      });

      const totalTaken = yearLeaves.length;

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Formulate detailed table
      const rows = [
        ['PERSONAL LEAVE TRACKER - YEARLY REPORT'],
        [`Employee Name: ${settings.userName}`],
        [`Employee Email: ${settings.email || 'N/A'}`],
        [`Assessment Year: ${year}`],
        [`Report Date: ${new Date().toLocaleDateString()}`],
        [],
        ['LEAVE ENTRIES LOG'],
        ['ID', 'Reason', 'Leave Type', 'Date', 'Date Added'],
        ...yearLeaves.map((l, index) => [
          index + 1,
          l.reason,
          l.type,
          l.date,
          new Date(l.createdAt).toLocaleDateString(),
        ]),
        [],
        ['LEAVE BALANCES SUMMARY'],
        ['Leave Type', 'Days Taken'],
        ['Casual', stats.Casual],
        ['Vacation', stats.Vacation],
        ['Duty', stats.Duty],
        [],
        ['TOTAL LEAVE TAKEN', totalTaken],
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Add simple styling column widths
      ws['!cols'] = [
        { wch: 6 },  // ID
        { wch: 30 }, // Reason
        { wch: 15 }, // Type
        { wch: 15 }, // Date
        { wch: 15 }, // Date Added
      ];

      XLSX.utils.book_append_sheet(wb, ws, `Leave Report ${year}`);

      // Generate base64 string
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Save file locally using FileSystem
      const filename = `${FileSystem.documentDirectory}Leave_Report_${year}.xlsx`;
      await FileSystem.writeAsStringAsync(filename, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Trigger sharing dialog
      await Sharing.shareAsync(filename, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Share Excel Report ${year}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (error) {
      console.error('Error generating Excel report:', error);
      throw error;
    }
  },
};
