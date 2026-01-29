import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { LayoutDashboard, Table as TableIcon, Activity, Filter, XCircle, Download, FileText } from 'lucide-react';
import { ProjectDetail } from './ProjectDetail';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Dashboard({ data, title = "Resumen General", type = "obras" }) {
    const [filterCol, setFilterCol] = useState('');
    const [filterVal, setFilterVal] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProject, setSelectedProject] = useState(null);

    // 1. Calculate available filters from RAW data
    const filterOptions = useMemo(() => {
        if (!data || data.length === 0) return {};
        const columns = Object.keys(data[0]);
        const options = {};

        columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            // Skip non-string or ID columns
            if (typeof data[0][col] !== 'string' ||
                lowerCol.includes('id') ||
                lowerCol.includes('bip') ||
                lowerCol.includes('codigo')) return;

            const values = [...new Set(data.map(row => row[col]).filter(val => val !== undefined && val !== null))];

            // Heuristic for useful filters: between 2 and 50 options
            if (values.length >= 2 && values.length <= 50) {
                options[col] = values.sort();
            }
        });
        return options;
    }, [data]);

    // 2. Apply Filter
    const filteredData = useMemo(() => {
        if (!filterCol || !filterVal) return data;
        return data.filter(row => row[filterCol] === filterVal);
    }, [data, filterCol, filterVal]);

    // 3. Analysis Logic (Runs on Filtered Data)
    const analysis = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return null;

        const columns = Object.keys(filteredData[0]);
        const rowCount = filteredData.length;

        // Identify numeric an categorical columns
        // Exclude Code-like columns and per-project independent values from numeric analysis
        const numericCols = columns.filter(col => {
            const lowerCol = col.toLowerCase();
            return typeof filteredData[0][col] === 'number' &&
                !lowerCol.includes('bip') &&
                !lowerCol.includes('codigo') &&
                !lowerCol.includes('id') &&
                !lowerCol.includes('superficie') &&
                !lowerCol.includes('avance') &&
                !lowerCol.includes('permiso');
        });

        const categoricalCols = columns.filter(col => typeof filteredData[0][col] === 'string');

        // Calculate totals for numeric columns
        const totals = numericCols.reduce((acc, col) => {
            acc[col] = filteredData.reduce((sum, row) => sum + (row[col] || 0), 0);
            return acc;
        }, {});

        // CHART LOGIC: Generate multiple charts for interesting categorical columns
        // Heuristic: Columns with > 1 and < 30 unique values are likely good categories (Status, Commune, etc)
        const chartConfigs = [];

        categoricalCols.forEach(col => {
            // Skip ID-like columns for charting
            const lowerCol = col.toLowerCase();
            if (lowerCol.includes('id') || lowerCol.includes('codigo') || lowerCol.includes('bip')) return;

            // Don't chart the column we are filtering by (it would be a single bar)
            if (col === filterCol) return;

            const counts = {};
            filteredData.forEach(row => {
                const val = row[col] || '(Vacío)';
                counts[val] = (counts[val] || 0) + 1;
            });

            const uniqueCount = Object.keys(counts).length;

            // Only include if it has a reasonable number of categories
            // INCREASED limit to 100 to allow Project Names to be charted
            if (uniqueCount > 1 && uniqueCount <= 100) {
                const chartData = Object.entries(counts)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 15); // Top 15 categories max per chart

                const title = col === 'Macrozona' ? 'Cartera' :
                    (col === 'NOMBRE DEL PROYECTO' ? 'Registros por Proyecto' : `Proyectos por ${col}`);

                chartConfigs.push({
                    title: title,
                    data: chartData,
                    key: col
                });
            }
        });

        // Sort charts: prioritize "Servicio de Salud" (Full Width), then "Clasificación", "Partida"
        const priorityTerms = ['servicio de salud', 'clasificacion', 'clasificación', 'partida', 'nombre del proyecto', 'cartera', 'macrozona', 'monitor', 'estado', 'comuna', 'situacion', 'etapa'];
        chartConfigs.sort((a, b) => {
            const aScore = priorityTerms.findIndex(t => a.title.toLowerCase().includes(t));
            const bScore = priorityTerms.findIndex(t => b.title.toLowerCase().includes(t));
            // If both found, lower index is better (higher priority). If not found, -1.
            // We want found items first.
            const aPrio = aScore !== -1 ? aScore : 999;
            const bPrio = bScore !== -1 ? bScore : 999;
            return aPrio - bPrio;
        });

        // Determine columns to display in table
        let tableColumns = columns;
        let tableData = filteredData;

        // Custom View Logic for Hospital Report
        const hasHospitalColumns = columns.includes('SERVICIO DE SALUD') && columns.includes('NOMBRE DEL PROYECTO');

        if (type === 'data') {
            // "Data" View: Strict specific columns
            // "Código BIP", "Proyecto", "Servicio de Salud"
            const desiredCols = [
                columns.find(c => c.toUpperCase().includes('BIP') || c.toUpperCase().includes('CÓDIGO')),
                columns.find(c => c.toLowerCase().includes('proyecto') || c.toLowerCase().includes('obra')),
                columns.find(c => c.toLowerCase().includes('servicio') && c.toLowerCase().includes('salud')),
            ];

            // Filter out undefined if a column isn't found
            tableColumns = desiredCols.filter(Boolean);

            // If strictly nothing found, fallback to all, but usually we prefer showing nothing if strict
            if (tableColumns.length === 0) tableColumns = columns;

        } else if (hasHospitalColumns) {
            // Aggregation Logic
            const aggregated = {};
            const allClassifications = new Set();

            filteredData.forEach(row => {
                const project = row['NOMBRE DEL PROYECTO'];
                if (!project) return;

                if (!aggregated[project]) {
                    aggregated[project] = {
                        'SERVICIO DE SALUD': row['SERVICIO DE SALUD'],
                        'NOMBRE DEL PROYECTO': project,
                        'Total Registros': 0
                    };
                }

                aggregated[project]['Total Registros']++;

                // Count Classification (handling variations if needed)
                const cls = row['Clasificación'] || row['Clasificacion'] || 'Sin Clasificar';
                allClassifications.add(cls);
                aggregated[project][cls] = (aggregated[project][cls] || 0) + 1;
            });

            // Sort by Total Registros desc
            tableData = Object.values(aggregated).sort((a, b) => b['Total Registros'] - a['Total Registros']);

            // Define friendly order for classifications
            const knownOrder = ['Errores de Diseño', 'Funcionalidad', 'AS/NTB', 'Normativa'];
            const clsArray = Array.from(allClassifications).sort((a, b) => {
                const idxA = knownOrder.indexOf(a);
                const idxB = knownOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
            });

            tableColumns = ['SERVICIO DE SALUD', 'NOMBRE DEL PROYECTO', 'Total Registros', ...clsArray];
        } else {
            // View Logic for "Control de Obras" (Heuristic: Check for BIP)
            const bipCol = columns.find(c => c.toUpperCase().includes('BIP') || c.toUpperCase().includes('CÓDIGO'));

            if (bipCol) {
                // Determine the exact executive columns based on availability
                // We map user requests to fuzzy matches in headers
                const desiredCols = [
                    bipCol, // BIP
                    columns.find(c => (c.toUpperCase().includes('NOMBRE') && (c.toUpperCase().includes('PROYECTO') || c.toUpperCase().includes('OBRA')))) || 'Nombre Proyecto',
                    columns.find(c => c.toUpperCase().includes('MONITOR')),
                    columns.find(c => c.toUpperCase().includes('SERVICIO') && c.toUpperCase().includes('SALUD')),
                    columns.find(c => c.toUpperCase().includes('AVANCE') && c.toUpperCase().includes('FISICO')),
                    columns.find(c => c.toUpperCase().includes('FECHA') && (c.toUpperCase().includes('TERMINO') || c.toUpperCase().includes('TÉRMINO')))
                ];

                // Filter out any columns that weren't found in the file
                tableColumns = desiredCols.filter(col => col && columns.includes(col));

                // If we found a good number of columns, use this view. Otherwise default to all.
                if (tableColumns.length < 3) tableColumns = columns;
            }
        }

        return {
            rowCount,
            columns: tableColumns,
            allColumns: columns,
            tableData, // Passed to rendering
            numericCols,
            totals,
            chartConfigs: chartConfigs.slice(0, 6)
        };
    }, [filteredData, filterCol]);

    // ... (rest of code) ...
    // Note: I will need to use a second chunk for the tooltip if I can't reach it contiguously.
    // The previous block ends around line 120. Tooltip is at 250.
    // I will use multi_replace for this.

    const resetFilter = () => {
        setFilterCol('');
        setFilterVal('');
    };

    const handleDownloadJSON = () => {
        if (!filteredData || filteredData.length === 0) return;
        const jsonString = JSON.stringify(filteredData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `data_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!data || data.length === 0) return null;

    return (
        <div className="animate-fade-in">
            <div className="heading-xl" style={{
                fontSize: '1.5rem',
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 2fr',
                gap: '2rem',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <LayoutDashboard className="text-accent-primary" size={28} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                </div>

                {/* FILTER & ACTIONS BAR */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'flex-end' }}>

                    {/* JSON Export Button */}
                    <button
                        onClick={handleDownloadJSON}
                        className="btn"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--bg-tertiary)' }}
                        title="Descargar datos filtrados como JSON"
                    >
                        <Download size={16} />
                        <span>JSON</span>
                    </button>

                    <div className="filter-bar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <Filter size={16} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Filtrar por:</span>
                        </div>

                        <select
                            className="input-select"
                            value={filterCol}
                            onChange={(e) => {
                                setFilterCol(e.target.value);
                                setFilterVal('');
                                setCurrentPage(1);
                            }}
                        >
                            <option value="">(Selecciona Columna)</option>
                            {Object.keys(filterOptions).map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>

                        {filterCol && (
                            <select
                                className="input-select"
                                value={filterVal}
                                onChange={(e) => {
                                    setFilterVal(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="">(Todos)</option>
                                {filterOptions[filterCol].map(val => (
                                    <option key={val} value={val}>{val}</option>
                                ))}
                            </select>
                        )}

                        {(filterCol || filterVal) && (
                            <button onClick={resetFilter} className="text-red-400 hover:text-red-300" title="Limpiar Filtro">
                                <XCircle size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {!analysis ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>No se encontraron datos que coincidan con tu filtro.</p>
                    <button onClick={resetFilter} className="btn" style={{ marginTop: '1rem' }}>Limpiar Filtro</button>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    {/* KPI Cards */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="stat-card">
                            <div className="stat-label">Total Registros</div>
                            <div className="stat-value">{analysis.rowCount.toLocaleString()}</div>
                        </div>

                        {/* Dynamic Numeric Totals - HIDDEN AS REQUESTED */}
                        {/* 
                         Object.entries(analysis.totals).map(([key, val]) => (
                            <div className="stat-card" key={key}>
                                <div className="stat-label">{key}</div>
                                <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                                    {key.toLowerCase().includes('uf')
                                        ? val.toLocaleString('es-CL', { maximumFractionDigits: 2 })
                                        : val.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })
                                    }
                                </div>
                            </div>
                        ))
                        */}
                    </div>

                    {/* Dynamic Charts Grid */}
                    {/* Dynamic Charts Grid */}
                    <div className="grid-cols-2" style={{ marginBottom: '3rem' }}>
                        {analysis.chartConfigs.map((config, idx) => {
                            const isHealthService = config.key === 'SERVICIO DE SALUD';

                            // Only Health Service gets full width (100%)
                            const isFullWidth = isHealthService;

                            return (
                                <div
                                    className="card"
                                    key={config.key}
                                    style={{
                                        minHeight: '400px',
                                        gridColumn: isFullWidth ? '1 / -1' : 'auto'
                                    }}
                                >
                                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                        <Activity size={18} className="text-muted" />
                                        <span>{config.title}</span>
                                    </h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        {isHealthService ? (
                                            // Vertical Bars (Column Chart) Configuration
                                            <BarChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.5} vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    stroke="#0f172a"
                                                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={60}
                                                    interval={0}
                                                />
                                                <YAxis stroke="#0f172a" tick={{ fill: '#334155', fontSize: 10, fontWeight: 500 }} />
                                                <Tooltip
                                                    cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                                                    contentStyle={{
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        borderColor: 'var(--text-primary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        color: 'var(--text-primary)',
                                                        boxShadow: 'var(--card-shadow)'
                                                    }}
                                                    itemStyle={{ color: 'var(--text-primary)' }}
                                                />
                                                <Bar dataKey="value" fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} barSize={40}>
                                                    {config.data.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[idx % COLORS.length]} stroke="#000" strokeWidth={0} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        ) : (
                                            // Standard Horizontal Bars Configuration (Existing)
                                            <BarChart data={config.data} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.5} horizontal={false} />
                                                <XAxis type="number" stroke="#0f172a" tick={{ fill: '#334155', fontSize: 10 }} />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    stroke="#0f172a"
                                                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
                                                    width={150}
                                                    interval={0}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                                                    contentStyle={{
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        borderColor: 'var(--text-primary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        color: 'var(--text-primary)',
                                                        boxShadow: 'var(--card-shadow)'
                                                    }}
                                                    itemStyle={{ color: 'var(--text-primary)' }}
                                                />
                                                <Bar dataKey="value" fill={COLORS[idx % COLORS.length]} radius={[0, 4, 4, 0]} barSize={20}>
                                                    {config.data.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[idx % COLORS.length]} fillOpacity={0.8 + (index * 0.0)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            );
                        })}
                    </div>

                    {/* Data Table with Pagination */}
                    {/* Data Table with Pagination */}
                    {(() => {
                        const itemsPerPage = 10;
                        const sourceData = analysis.tableData || filteredData;

                        // --- QUICK FILTER LOGIC ---
                        // 1. Cartera
                        const carteraCol = analysis.allColumns.find(c => c.toUpperCase().includes('CARTERA'));
                        let uniqueCarteras = [];
                        if (carteraCol) {
                            uniqueCarteras = [...new Set(data.map(d => d[carteraCol]))].filter(Boolean).sort();
                        }

                        // 2. Servicios de Salud
                        const servicioCol = analysis.allColumns.find(c => c.toUpperCase().includes('SERVICIO') && c.toUpperCase().includes('SALUD'));
                        let uniqueServicios = [];
                        if (servicioCol) {
                            uniqueServicios = [...new Set(data.map(d => d[servicioCol]))].filter(Boolean).sort();
                        }

                        const isCarteraActive = filterCol === carteraCol;
                        const isServicioActive = filterCol === servicioCol;

                        const totalPages = Math.ceil(sourceData.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const currentData = sourceData.slice(startIndex, startIndex + itemsPerPage);

                        // Helper to render filter buttons
                        const renderFilterButtons = (items, colName, isActive, label) => {
                            if (!items || items.length === 0 || items.length > 50) return null; // Limit to 50
                            return (
                                <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '80px' }}>{label}:</span>
                                    <button
                                        className="btn"
                                        onClick={() => resetFilter()}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            fontSize: '0.75rem', // Smaller font
                                            borderRadius: '1rem',
                                            background: (!isActive && !filterCol) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                            color: (!isActive && !filterCol) ? 'white' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            border: 'none',
                                            fontWeight: 500
                                        }}
                                    >
                                        Todos
                                    </button>
                                    {items.map(val => (
                                        <button
                                            key={val}
                                            className="btn"
                                            onClick={() => {
                                                setFilterCol(colName);
                                                setFilterVal(val);
                                                setCurrentPage(1);
                                            }}
                                            style={{
                                                padding: '0.25rem 0.75rem',
                                                fontSize: '0.75rem',
                                                borderRadius: '1rem',
                                                background: (isActive && filterVal === val) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                                color: (isActive && filterVal === val) ? 'white' : 'var(--text-secondary)',
                                                border: '1px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            );
                        };

                        return (
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                        <TableIcon size={20} className="text-muted" />
                                        <span>Detalle de Datos ({sourceData.length} registros)</span>
                                    </h3>
                                </div>

                                {/* QUICK FILTER ROWS */}
                                <div style={{ marginBottom: '1rem' }}>
                                    {renderFilterButtons(uniqueServicios, servicioCol, isServicioActive, "Servicios")}
                                    {renderFilterButtons(uniqueCarteras, carteraCol, isCarteraActive, "Cartera")}
                                </div>
                                <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left' }}>
                                                {analysis.columns.map(col => (
                                                    <th key={col} style={{ padding: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{col}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentData.map((row, i) => (
                                                <tr
                                                    key={i}
                                                    style={{
                                                        borderBottom: '1px solid var(--bg-tertiary)',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    className="hover:bg-slate-100"
                                                    // Only open details if it's a raw row (not aggregated). 
                                                    // If aggregated, we might want to handle it differently later, but for now disable click or show first
                                                    // Simple heuristic: Does it have 'Total Registros'? Then it's aggregated.
                                                    onClick={() => !row['Total Registros'] && setSelectedProject(row)}
                                                    title={row['Total Registros'] ? '' : "Click para ver ficha completa"}
                                                >
                                                    {analysis.columns.map(col => (
                                                        <td key={`${i}-${col}`} style={{ padding: '0.75rem', whiteSpace: 'normal', textAlign: (typeof row[col] === 'number') ? 'center' : 'left' }}>
                                                            {/* If value is missing (undefined) in aggregation, it means 0 */}
                                                            {row[col] !== undefined ? row[col] : (col === 'SERVICIO DE SALUD' ? '' : 0)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {
                                    totalPages > 1 && (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                Anterior
                                            </button>
                                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                                Página {currentPage} de {totalPages}
                                            </span>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    )
                                }
                            </div >
                        );
                    })()}
                </>
            )}
            {/* Project Details Modal */}
            {
                selectedProject && (
                    <ProjectDetail
                        project={selectedProject}
                        onClose={() => setSelectedProject(null)}
                    />
                )
            }
        </div >
    );
}
