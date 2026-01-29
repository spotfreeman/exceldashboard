
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./archivos_analisis', 'Histórico NC 2022 Hospitales.xlsx');
const sheetName = '2_Notas de Cambio';

try {
    console.log(`Leyendo archivo: ${filePath}`);
    const workbook = XLSX.readFile(filePath);

    if (!workbook.SheetNames.includes(sheetName)) {
        console.error(`ERROR: La hoja '${sheetName}' no existe.`);
        console.log('Hojas disponibles:', workbook.SheetNames);
    } else {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Header: 1 to get array of arrays

        if (jsonData.length > 0) {
            console.log('\n--- HEADERS ---');
            console.log(jsonData[0]);

            console.log('\n--- PRIMERA FILA DE DATOS ---');
            console.log(jsonData[1] || 'No hay datos');

            console.log('\n--- SEGUNDA FILA DE DATOS ---');
            console.log(jsonData[2] || 'No hay datos');

            // Analyze columns for potential KPIs
            const headers = jsonData[0];
            console.log(`\nTotal Columnas: ${headers.length}`);
        } else {
            console.log('La hoja está vacía.');
        }
    }

} catch (error) {
    console.error('Error al leer el archivo:', error.message);
}
