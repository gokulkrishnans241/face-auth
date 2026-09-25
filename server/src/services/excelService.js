import ExcelJS from 'exceljs';
import { format } from 'date-fns';

/**
 * Apply styling to header row
 */
const styleHeaderRow = (row) => {
  row.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // Teal 700
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0D9488' } },
      left: { style: 'thin', color: { argb: 'FF0D9488' } },
      bottom: { style: 'medium', color: { argb: 'FF115E59' } },
      right: { style: 'thin', color: { argb: 'FF0D9488' } },
    };
  });
  row.height = 26;
};

/**
 * Apply cell borders and alignment
 */
const styleDataRow = (row, isEven) => {
  row.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10 };
    cell.alignment = { vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    if (isEven) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };
    }
  });
  row.height = 20;
};

/**
 * Generate Comprehensive Multi-Tab Attendance Workbook
 */
export const generateAttendanceWorkbook = async ({
  dailySummary = [],
  sessionSummary = [],
  detailedRecords = [],
  studentSummary = [],
  metadata = {},
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Face Attendance Management System';
  workbook.created = new Date();

  // ==========================================
  // SHEET 1: DAILY SUMMARY
  // ==========================================
  const sheet1 = workbook.addWorksheet('Daily Summary', {
    views: [{ showGridLines: true }],
  });

  sheet1.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Classroom', key: 'classroom', width: 28 },
    { header: 'Total Students', key: 'totalStudents', width: 16 },
    { header: 'Total Sessions', key: 'totalSessions', width: 16 },
    { header: 'Total Present Records', key: 'totalPresent', width: 20 },
    { header: 'Total Absent Records', key: 'totalAbsent', width: 20 },
    { header: 'Attendance %', key: 'percentage', width: 16 },
  ];

  styleHeaderRow(sheet1.getRow(1));

  dailySummary.forEach((item, index) => {
    const row = sheet1.addRow({
      date: item.date,
      classroom: item.classroomName || item.classroomId,
      totalStudents: item.totalStudents,
      totalSessions: item.totalSessions,
      totalPresent: item.totalPresent,
      totalAbsent: item.totalAbsent,
      percentage: `${item.percentage.toFixed(1)}%`,
    });
    styleDataRow(row, index % 2 === 1);
  });

  // ==========================================
  // SHEET 2: SESSION SUMMARY
  // ==========================================
  const sheet2 = workbook.addWorksheet('Session Summary', {
    views: [{ showGridLines: true }],
  });

  sheet2.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Classroom', key: 'classroom', width: 24 },
    { header: 'Session No.', key: 'sessionNumber', width: 14 },
    { header: 'Session Name', key: 'sessionName', width: 28 },
    { header: 'Start Time', key: 'startTime', width: 14 },
    { header: 'End Time', key: 'endTime', width: 14 },
    { header: 'Total Eligible', key: 'totalEligible', width: 16 },
    { header: 'Present Count', key: 'presentCount', width: 16 },
    { header: 'Absent Count', key: 'absentCount', width: 16 },
    { header: 'Attendance %', key: 'percentage', width: 16 },
  ];

  styleHeaderRow(sheet2.getRow(1));

  sessionSummary.forEach((item, index) => {
    const row = sheet2.addRow({
      date: item.date,
      classroom: item.classroomName || item.classroomId,
      sessionNumber: `Period ${item.sessionNumber}`,
      sessionName: item.sessionName,
      startTime: item.startTime,
      endTime: item.endTime,
      totalEligible: item.totalEligibleStudents,
      presentCount: item.presentCount,
      absentCount: item.absentCount,
      percentage: `${item.percentage.toFixed(1)}%`,
    });
    styleDataRow(row, index % 2 === 1);
  });

  // ==========================================
  // SHEET 3: DETAILED ATTENDANCE
  // ==========================================
  const sheet3 = workbook.addWorksheet('Detailed Attendance', {
    views: [{ showGridLines: true }],
  });

  sheet3.columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Student ID', key: 'studentId', width: 16 },
    { header: 'Student Name', key: 'studentName', width: 26 },
    { header: 'Department', key: 'department', width: 26 },
    { header: 'Classroom', key: 'classroom', width: 24 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Session No.', key: 'sessionNumber', width: 14 },
    { header: 'Session Name', key: 'sessionName', width: 24 },
    { header: 'Check-in Time', key: 'checkInTime', width: 18 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Updated By', key: 'updatedBy', width: 20 },
    { header: 'Correction Reason', key: 'correctionReason', width: 28 },
  ];

  styleHeaderRow(sheet3.getRow(1));

  detailedRecords.forEach((record, index) => {
    const row = sheet3.addRow({
      sno: index + 1,
      studentId: record.studentUserId || 'N/A',
      studentName: record.studentName || 'Unknown Student',
      department: record.department || 'CSE',
      classroom: record.classroomName || 'N/A',
      date: record.date,
      sessionNumber: `Period ${record.sessionNumber}`,
      sessionName: record.sessionName || `Period ${record.sessionNumber}`,
      checkInTime: record.checkInTime ? format(new Date(record.checkInTime), 'hh:mm:ss a') : '—',
      status: record.status,
      updatedBy: record.updatedBy || record.verificationMethod || 'Face Recognition',
      correctionReason: record.correctionReason || '—',
    });

    styleDataRow(row, index % 2 === 1);

    // Apply color badge to status cell
    const statusCell = row.getCell('status');
    if (record.status === 'Present') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' }, // Light Green
      };
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF166534' } };
    } else if (record.status === 'Absent') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' }, // Light Red
      };
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF991B1B' } };
    } else {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' }, // Amber
      };
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF92400E' } };
    }
  });

  // ==========================================
  // SHEET 4: STUDENT SUMMARY
  // ==========================================
  const sheet4 = workbook.addWorksheet('Student Summary', {
    views: [{ showGridLines: true }],
  });

  sheet4.columns = [
    { header: 'Student ID', key: 'studentId', width: 18 },
    { header: 'Student Name', key: 'studentName', width: 28 },
    { header: 'Classroom', key: 'classroom', width: 24 },
    { header: 'Total Eligible Sessions', key: 'totalEligible', width: 22 },
    { header: 'Present Count', key: 'presentCount', width: 16 },
    { header: 'Absent Count', key: 'absentCount', width: 16 },
    { header: 'Attendance %', key: 'percentage', width: 18 },
  ];

  styleHeaderRow(sheet4.getRow(1));

  studentSummary.forEach((item, index) => {
    const row = sheet4.addRow({
      studentId: item.studentUserId || 'N/A',
      studentName: item.studentName || 'N/A',
      classroom: item.classroomName || 'All Classrooms',
      totalEligible: item.totalEligibleSessions,
      presentCount: item.presentCount,
      absentCount: item.absentCount,
      percentage: `${item.percentage.toFixed(1)}%`,
    });
    styleDataRow(row, index % 2 === 1);
  });

  return workbook;
};
