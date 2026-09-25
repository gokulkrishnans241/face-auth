import apiClient from '../api/client';

/**
 * Robust authenticated blob download for Excel reports
 */
export const downloadExcelReport = async ({
  startDate,
  endDate,
  classroomId = '',
  sessionId = '',
  customFilename = '',
}) => {
  try {
    const params = {
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || startDate || new Date().toISOString().split('T')[0],
    };

    if (classroomId) params.classroomId = classroomId;
    if (sessionId) params.sessionId = sessionId;

    const response = await apiClient.get('/reports/excel', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const filename =
      customFilename ||
      `Attendance_Report_${params.startDate}_to_${params.endDate}.xlsx`;

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);

    return { success: true, message: 'Report downloaded successfully.' };
  } catch (error) {
    console.error('Download Excel error:', error);
    let errorMsg = 'Failed to download Excel report.';
    if (error.response && error.response.data) {
      try {
        // If response is a blob containing JSON error
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        if (json.message) errorMsg = json.message;
      } catch {
        // ignore JSON parse fallback
      }
    }
    throw new Error(errorMsg);
  }
};
