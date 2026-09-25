import apiClient from '../api/client';

/**
 * Robust authenticated blob download for Excel reports (.xlsx)
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

/**
 * Export Classroom 7-Period Matrix directly as Microsoft XML Spreadsheet (.xml)
 */
export const downloadXmlReport = ({ matrixData, date, customFilename = '' }) => {
  if (!matrixData || !matrixData.classroom) return;

  const classroom = matrixData.classroom;
  const periods = matrixData.periods || [];
  const students = matrixData.students || [];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#0F766E" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Present">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#047857" ss:Bold="1"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Absent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#B91C1C" ss:Bold="1"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Unmarked">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#64748B"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Classroom Period Matrix">
  <Table>
   <Row>
    <Cell ss:StyleID="Title"><Data ss:Type="String">Smart Attendance - ${classroom.name} (${classroom.classroomId})</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Date: ${date} | Room Number: ${classroom.roomNumber} | Department: ${classroom.department}</Data></Cell>
   </Row>
   <Row/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Roll Number</Data></Cell>
    <Cell><Data ss:Type="String">Student Name</Data></Cell>
    <Cell><Data ss:Type="String">Department</Data></Cell>
    ${periods.map((p) => `<Cell><Data ss:Type="String">Period ${p.sessionNumber} (${p.startTime}-${p.endTime})</Data></Cell>`).join('')}
    <Cell><Data ss:Type="String">Total Present</Data></Cell>
    <Cell><Data ss:Type="String">Total Absent</Data></Cell>
    <Cell><Data ss:Type="String">Attendance Rate %</Data></Cell>
   </Row>
   ${students
     .map(
       (st) => `
   <Row>
    <Cell><Data ss:Type="String">${st.userId}</Data></Cell>
    <Cell><Data ss:Type="String">${st.name}</Data></Cell>
    <Cell><Data ss:Type="String">${st.department}</Data></Cell>
    ${st.periods
      .map((p) => {
        const styleId = p.status === 'Present' ? 'Present' : p.status === 'Absent' ? 'Absent' : 'Unmarked';
        return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${p.status || '—'}</Data></Cell>`;
      })
      .join('')}
    <Cell><Data ss:Type="Number">${st.summary.totalPresent}</Data></Cell>
    <Cell><Data ss:Type="Number">${st.summary.totalAbsent}</Data></Cell>
    <Cell><Data ss:Type="Number">${st.summary.percentage}</Data></Cell>
   </Row>`
     )
     .join('')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const filename = customFilename || `Class_${classroom.classroomId}_Period_Matrix_${date}.xml`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true, message: 'XML Spreadsheet downloaded successfully.' };
};
