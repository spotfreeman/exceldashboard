/**
 * Utility functions for normalizing Excel data.
 * Addresses typographic errors, inconsistencies, and formatting issues.
 */

// Common mappings for standardizing status/state columns
const STATUS_MAPPINGS = {
    // Variations of "En Ejecución"
    'en ejecucion': 'En Ejecución',
    'en ejecución': 'En Ejecución',
    'ejecucion': 'En Ejecución',
    'ejecución': 'En Ejecución',

    // Variations of "Terminado"
    'terminado': 'Terminado',
    'finalizado': 'Terminado',
    'completo': 'Terminado',
    'recepcionado': 'Terminado', // specific to construction/public works

    // Variations of "En Diseño"
    'en diseño': 'En Diseño',
    'en diseno': 'En Diseño',
    'diseno': 'En Diseño',
    'diseño': 'En Diseño',
};

/**
 * Normalizes a single string value.
 * @param {string} val 
 * @returns {string}
 */
const normalizeString = (val) => {
    if (typeof val !== 'string') return val;
    return val.trim().replace(/\s+/g, ' '); // Remove extra spaces
};

/**
 * Normalizes a header/column name.
 * @param {string} header 
 * @returns {string}
 */
const normalizeHeader = (header) => {
    const clean = header.trim();

    // Normalization map for "Historico NC 2022 Hospitales"
    if (clean.includes('AUMENTO') && clean.includes('CON IVA')) return 'Aumento (IVA)';
    if (clean.includes('DISMINUCIÓN') && clean.includes('CON IVA')) return 'Disminución (IVA)';
    if (clean.includes('OBRA EXTRAORDINARIA') && clean.includes('CON IVA')) return 'Obra Extra (IVA)';
    if (clean.includes('INDEMNIZACIÓN POR PLAZO') && clean.includes('CON IVA')) return 'Indemnización Plazo (IVA)';
    if (clean.includes('ORD') && clean.includes('INGRESO NC')) return 'Ord. Ingreso';
    if (clean.includes('C4 MINSAL') && clean.includes('RESPUESTA')) return 'C4 Minsal Respuesta';
    if (clean.includes('FECHA INGRESO')) return 'Fecha Ingreso';
    if (clean.includes('VALOR UF')) return 'Valor UF';

    return clean;
};

/**
 * Converts Excel Serial Date to JS Date
 * @param {number} serial 
 * @returns {Date|null}
 */
const excelDateToJSDate = (serial) => {
    if (!serial || isNaN(serial)) return null;
    // Excel base date is Dec 30, 1899 approx (accounting for leap year bug)
    // 25569 is the offset for Unix epoch (1970-01-01)
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info;
};

/**
 * Main normalization function for the dataset.
 * @param {Array<Object>} rawData - The JSON data from XLSX
 * @returns {Array<Object>} Normalized data
 */
export const normalizeData = (rawData) => {
    if (!Array.isArray(rawData) || rawData.length === 0) return [];

    return rawData.map(row => {
        const newRow = {};

        Object.keys(row).forEach(key => {
            const cleanKey = normalizeHeader(key);
            let value = row[key];

            // String Normalization
            if (typeof value === 'string') {
                value = normalizeString(value);

                // Specific Column Normalizations (Heuristic based on common terms)
                const lowerValue = value.toLowerCase();

                // Normalize Status-like columns
                if (STATUS_MAPPINGS[lowerValue]) {
                    value = STATUS_MAPPINGS[lowerValue];
                }
            }

            // DATE HANDLING: Extract Year for filtering
            // Check if key looks like a date and value is a number (Excel serial)
            if (typeof value === 'number' && cleanKey.toLowerCase().includes('fecha')) {
                const dateObj = excelDateToJSDate(value);
                if (dateObj && !isNaN(dateObj)) {
                    // Add virtual column 'Año'
                    // Javascript getFullYear is reliable
                    // We add roughly 1 day (timezone compensation) if needed, but usually 1900 system works roughly well
                    // For pure years, simple extraction is safer
                    newRow['Año'] = dateObj.getUTCFullYear().toString();

                    // Format the date properly for display (DD/MM/YYYY)
                    const day = dateObj.getUTCDate().toString().padStart(2, '0');
                    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
                    value = `${day}/${month}/${dateObj.getUTCFullYear()}`;
                }
            }

            newRow[cleanKey] = value;
        });

        return newRow;
    });
};
