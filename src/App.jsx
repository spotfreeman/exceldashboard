import { useState, useEffect } from 'react'
import { FileUpload } from './components/FileUpload'
import { Dashboard } from './components/Dashboard'
import './index.css'

function App() {
  const [data, setData] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [sheetName, setSheetName] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Dashboard Context State
  const [activeTab, setActiveTab] = useState('obras'); // 'obras' | 'nuevo'

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDataLoaded = (newData, name, sheet) => {
    setData(newData);
    setFileName(name);
    setSheetName(sheet);
  };

  const switchTab = (tab) => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    setData(null);
    setFileName(null);
    setSheetName(null);
  };

  const tabConfig = {
    'obras': {
      title: 'Control de Proyectos DMO',
      allowedSheets: ['DMO-Obras'],
      description: 'Estado de avance, presupuestos y gestión de obras.'
    },
    'nuevo': {
      title: 'Histórico Notas de Cambio (Hospitales 2022)',
      allowedSheets: ['2_Notas de Cambio', 'Notas de Cambio', 'Hoja1'],
      description: 'Análisis de aumentos, disminuciones y obras extraordinarias.'
    }
  };

  return (
    <div className="min-h-screen bg-primary transition-colors duration-300">
      <main className="container">

        {/* Compact Header Section */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--bg-tertiary)',
          paddingBottom: '1rem'
        }}>
          <div>
            <h1 className="heading-xl" style={{ marginBottom: '0.25rem', fontSize: '1.8rem' }}>Excel Dashboard</h1>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              {tabConfig[activeTab].description}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
              {currentTime.toLocaleTimeString()}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Navigation & File Status Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          background: 'var(--bg-secondary)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--bg-tertiary)'
        }}>
          {/* Left Side: Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${activeTab === 'obras' ? '' : 'text-muted'}`}
              onClick={() => switchTab('obras')}
              style={{
                background: activeTab === 'obras' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'obras' ? 'white' : 'var(--text-secondary)',
                border: activeTab === 'obras' ? 'none' : '1px solid transparent',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem'
              }}
            >
              📊 Control Obras
            </button>
            <button
              className={`btn ${activeTab === 'nuevo' ? '' : 'text-muted'}`}
              onClick={() => switchTab('nuevo')}
              style={{
                background: activeTab === 'nuevo' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'nuevo' ? 'white' : 'var(--text-secondary)',
                border: activeTab === 'nuevo' ? 'none' : '1px solid transparent',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem'
              }}
            >
              ✨ Notas de Cambio
            </button>
          </div>

          {/* Right Side: Compact File Upload / Status */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <FileUpload
              key={activeTab}
              onDataLoaded={handleDataLoaded}
              sheetName={sheetName}
              allowedSheetNames={tabConfig[activeTab].allowedSheets}
              compactMode={true}
            />
          </div>
        </div>

        {/* Dashboard Section - Upload Area Only Shows if No Data */}
        {!data && (
          <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
            <p className="text-muted" style={{ marginBottom: '1rem' }}>
              Selecciona una pestaña y carga tu archivo para comenzar.
            </p>
          </div>
        )}

        {data && (
          <div className="animate-fade-in">
            {/* We can eventually pass a 'type' prop to Dashboard to customize it */}
            <Dashboard data={data} title={tabConfig[activeTab].title} />
          </div>
        )}

      </main>
    </div>
  )
}

export default App
