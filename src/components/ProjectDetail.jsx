import React from 'react';
import { X, Building, Calendar, DollarSign, MapPin, FileText, Activity } from 'lucide-react';

export function ProjectDetail({ project, onClose }) {
    if (!project) return null;

    // Helper to categorize fields (simple heuristic)
    const categorizeField = (key, value) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('fecha') || lowerKey.includes('plazo') || lowerKey.includes('inicio') || lowerKey.includes('termino')) return 'dates';
        if (lowerKey.includes('monto') || lowerKey.includes('inversion') || lowerKey.includes('costo') || typeof value === 'number' && value > 10000) return 'financial';
        if (lowerKey.includes('ubicacion') || lowerKey.includes('comuna') || lowerKey.includes('direccion') || lowerKey.includes('region')) return 'location';
        if (lowerKey.includes('estado') || lowerKey.includes('avance') || lowerKey.includes('situacion')) return 'status';
        return 'general';
    };

    const categories = {
        general: [],
        dates: [],
        financial: [],
        location: [],
        status: []
    };

    Object.entries(project).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        const category = categorizeField(key, value);
        categories[category].push({ key, value });
    });

    const Section = ({ title, icon: Icon, items }) => {
        if (items.length === 0) return null;
        return (
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '1rem',
                    borderBottom: '1px solid var(--bg-tertiary)',
                    paddingBottom: '0.5rem'
                }}>
                    <Icon size={20} className="text-accent-primary" />
                    {title}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {items.map(({ key, value }) => (
                        <div key={key} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                {key}
                            </div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-word' }}>
                                {value.toString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
        }} onClick={onClose}>
            <div
                className="animate-fade-in"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-xl)',
                    width: '100%',
                    maxWidth: '900px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--card-shadow-hover)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid var(--bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ficha Express</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Detalle completo del registro</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{
                            padding: '0.5rem',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--bg-tertiary)'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div style={{ overflowY: 'auto', padding: '2rem' }}>
                    <Section title="Información General" icon={FileText} items={categories.general} />
                    <Section title="Estado y Avance" icon={Activity} items={categories.status} />
                    <Section title="Fechas y Plazos" icon={Calendar} items={categories.dates} />
                    <Section title="Financiero" icon={DollarSign} items={categories.financial} />
                    <Section title="Ubicación" icon={MapPin} items={categories.location} />
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 2rem',
                    borderTop: '1px solid var(--bg-tertiary)',
                    textAlign: 'right'
                }}>
                    <button onClick={onClose} className="btn">Cerrar Ficha</button>
                </div>
            </div>
        </div>
    );
}
