import React from 'react';
import { Save, Upload, Cloud, RefreshCw, Trash2, Users, X, Download, AlertCircle } from 'lucide-react';
import { DONORS_LIST } from '../constants/ledgerConstants';

function SettingsView({
    transactions, donors, budgets,
    setTransactions, setDonors, setBudgets,
    saveHistory,
    clientId, setClientId,
    isDriveConnected, onConnectDrive, onDisconnectDrive,
    onSyncDrive, onLoadDrive, lastSyncTime, isSyncing,
    autoSync, setAutoSync
}) {
    const exportData = () => {
        const data = { transactions, donors, budgets };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `raon_church_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const importData = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                if (!text || text.trim() === "") {
                    throw new Error("파일 내용이 비어있습니다.");
                }

                const data = JSON.parse(text);

                // Data validation
                if (!data || typeof data !== 'object') {
                    throw new Error("유효한 JSON 형식이 아닙니다.");
                }

                saveHistory();

                let success = false;
                if (Array.isArray(data.transactions)) {
                    setTransactions(data.transactions);
                    success = true;
                }
                if (Array.isArray(data.donors)) {
                    setDonors(data.donors);
                    success = true;
                }
                if (data.budgets && typeof data.budgets === 'object') {
                    setBudgets(data.budgets);
                    success = true;
                }

                if (!success) {
                    throw new Error("파일에 라온동행교회 장부 데이터(내역, 명단, 예산)가 포함되어 있지 않습니다.");
                }

                alert("데이터를 성공적으로 복원했습니다.");
            } catch (err) {
                console.error("Import Error:", err);
                alert(`파일을 불러올 수 없습니다.\n오류 내용: ${err.message}`);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input to allow re-selecting same file
    };

    const removeDonor = (name) => {
        if (window.confirm(`'${name}' 님을 명단에서 삭제하시겠습니까?`)) {
            setDonors(prev => prev.filter(d => d !== name));
        }
    };

    const clearData = () => {
        if (window.confirm("정말로 모든 데이터를 삭제하고 초기화하시겠습니까?\n이 작업은 절대 되돌릴 수 없습니다.\n(페이지가 새로고침됩니다)")) {
            // Force clear localStorage synchronously
            try {
                localStorage.removeItem('raon_transactions');
                localStorage.removeItem('raon_budgets');
                localStorage.removeItem('raon_donors');
                localStorage.removeItem('raon_history'); // Clean up history if present
                console.log('Local storage cleared');
            } catch (e) {
                console.error('Failed to clear local storage', e);
            }

            alert("모든 데이터가 초기화되었습니다.");
            window.location.reload();
        }
    };

    return (
        <div className="settings-container">
            <div className="settings-header" style={{ marginBottom: '2.5rem' }}>
                <h2>설정 및 관리</h2>
                <p className="text-muted">데이터 백업, 자동 동기화 및 시스템 설정을 관리합니다.</p>
            </div>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                <div className="card shadow-sm p-5" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Cloud className="text-primary" /> 구글 드라이브 동기화
                    </h3>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        구글 계정을 연결하여 어느 기기에서나 동일한 장부 데이터를 확인하고 수정할 수 있습니다.
                    </p>

                    {!isDriveConnected ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#64748b' }}>Google Client ID</label>
                                <input
                                    type="text"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    placeholder="예: 12345...apps.googleusercontent.com"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                />
                                {clientId && !clientId.endsWith('.apps.googleusercontent.com') && (
                                    <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertCircle size={14} />
                                        {clientId.includes('@') ? '이메일 주소가 아닌 Client ID를 입력해야 합니다.' : '올바른 Client ID 형식이 아닌 것 같습니다.'}
                                    </p>
                                )}
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                    Google Cloud Console에서 생성한 <strong>OAuth 2.0 클라이언트 ID</strong>를 입력하세요. (이메일 아님)
                                </p>
                            </div>
                            <button
                                className="sync-btn"
                                onClick={onConnectDrive}
                                disabled={!clientId || !clientId.endsWith('.apps.googleusercontent.com')}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <Cloud size={18} /> 구글 계정 연결
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></div>
                                구글 드라이브와 연결됨
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '0.9rem' }}>자동 동기화</span>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={autoSync}
                                        onChange={(e) => setAutoSync(e.target.checked)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="sync-btn"
                                    onClick={onSyncDrive}
                                    disabled={isSyncing}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                    title="현재 데이터를 클라우드에 저장(업로드)"
                                >
                                    <RefreshCw size={18} className={isSyncing ? "spin" : ""} />
                                    {isSyncing ? "동기화 중..." : "수동 저장"}
                                </button>
                                <button
                                    className="undo-btn"
                                    onClick={onLoadDrive}
                                    disabled={isSyncing}
                                    style={{ padding: '0.75rem' }}
                                    title="클라우드에서 데이터 불러오기(다운로드)"
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    className="undo-btn"
                                    onClick={onDisconnectDrive}
                                    style={{ padding: '0.75rem' }}
                                    title="연결 해제"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {lastSyncTime && (
                                <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                                    마지막 동기화: {lastSyncTime.toLocaleString()}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="card shadow-sm p-5" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Save className="text-secondary" /> 로컬 백업 및 복원
                    </h3>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        파일로 백업하여 데이터를 안전하게 보관하거나 다른 기기에서 불러올 수 있습니다.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button className="export-btn" onClick={exportData} style={{ width: '100%', justifyContent: 'center' }}>
                            <Save size={18} /> 백업 파일 다운로드 (.json)
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button className="export-btn" style={{ width: '100%', justifyContent: 'center' }}>
                                <Upload size={18} /> 백업 파일 불러오기
                            </button>
                            <input
                                type="file"
                                accept=".json"
                                onChange={importData}
                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="card shadow-sm p-5" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', gridColumn: 'span 2' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users className="text-primary" /> 헌금자 명단 관리
                    </h3>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        등록된 헌금자 명단을 확인하고 불필요한 이름을 삭제할 수 있습니다.
                    </p>
                    <div className="donor-list-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        {donors.map(name => (
                            <div key={name} className="donor-tag" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                <span>{name}</span>
                                <button
                                    onClick={() => removeDonor(name)}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card shadow-sm p-5" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', gridColumn: 'span 2' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trash2 size={20} /> 위험 구역 (Danger Zone)
                    </h3>
                    <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                        모든 장부 데이터와 설정을 영구적으로 삭제합니다.
                    </p>
                    <button className="delete-btn" onClick={clearData} style={{ color: '#ef4444', border: '1px solid #fee2e2', padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
                        전체 데이터 초기화
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsView;
