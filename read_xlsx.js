const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile('tmp/clientes.xlsx');
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  
  if (data.length > 0) {
    console.log("Headers found:");
    console.log(data[0]);
    console.log("First row after headers:");
    console.log(data[1]);
  } else {
    console.log("No data found in the spreadsheet.");
  }
} catch (err) {
  console.error("Error reading file:", err.message);
}
