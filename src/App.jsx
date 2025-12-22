import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    Table,
    PieChart,
    Settings,
    PlusCircle,
    Search,
    Download,
    Cloud,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Receipt,
    Undo2
} from 'lucide-react';
import { DONORS_LIST, INCOME_CATEGORIES, EXPENSE_CATEGORIES, VIEW_MODES } from './constants/ledgerConstants';
import LedgerView from './components/LedgerView';
import DashboardView from './components/DashboardView';
import ReceiptsView from './components/ReceiptsView';
import BudgetView from './components/BudgetView';
import SettingsView from './components/SettingsView';
import { GoogleDriveUtils } from './utils/googleDrive';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [transactions, setTransactions] = useState([]);
    const [donors, setDonors] = useState(DONORS_LIST);
    const [budgets, setBudgets] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState(VIEW_MODES.MONTHLY);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [history, setHistory] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Google Drive State
    const [clientId, setClientId] = useState('');
    const [isDriveConnected, setIsDriveConnected] = useState(false);
    const [autoSync, setAutoSync] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const filteredByDateTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.date);
            if (viewMode === VIEW_MODES.YEARLY) {
                return txDate.getFullYear() === currentDate.getFullYear();
            } else if (viewMode === VIEW_MODES.MONTHLY) {
                return txDate.getFullYear() === currentDate.getFullYear() &&
                    txDate.getMonth() === currentDate.getMonth();
            } else if (viewMode === VIEW_MODES.DAILY) {
                return txDate.toDateString() === currentDate.toDateString();
            }
            return true; // For WEEKLY we could implement more complex logic, but for now yearly/monthly/daily are core
        });
    }, [transactions, viewMode, currentDate]);

    // Load data from localStorage on init
    useEffect(() => {
        const savedTransactions = localStorage.getItem('raon_transactions');
        if (savedTransactions) {
            try {
                const loaded = JSON.parse(savedTransactions);
                if (Array.isArray(loaded)) {
                    // Migration: Convert '전년이월금' to '일반이월금' or '특별이월금'
                    const migrated = loaded.map(tx => {
                        if (tx.category === '전년이월금') {
                            return {
                                ...tx,
                                category: tx.financeType === '특별재정' ? '특별이월금' : '일반이월금'
                            };
                        }
                        return tx;
                    });
                    setTransactions(migrated);
                } else {
                    console.error("Saved transactions format invlid");
                    setTransactions([]);
                }
            } catch (e) {
                console.error("Failed to parse transactions", e);
                setTransactions([]);
            }
        }

        const savedDonors = localStorage.getItem('raon_donors');
        if (savedDonors) setDonors(JSON.parse(savedDonors));

        const savedBudgets = localStorage.getItem('raon_budgets');
        if (savedBudgets) setBudgets(JSON.parse(savedBudgets));

        const savedClientId = localStorage.getItem('raon_client_id');
        if (savedClientId) setClientId(savedClientId);

        const savedAutoSync = localStorage.getItem('raon_auto_sync');
        if (savedAutoSync) setAutoSync(JSON.parse(savedAutoSync));

        setIsLoaded(true);
    }, []);

    // Init Drive if Client ID exists
    useEffect(() => {
        if (clientId) {
            GoogleDriveUtils.init(clientId).catch(console.error);
        }
    }, [clientId]);

    // Sync to localStorage
    useEffect(() => {
        if (!isLoaded) return; // Prevent overwriting with empty state before load

        localStorage.setItem('raon_transactions', JSON.stringify(transactions));
        localStorage.setItem('raon_donors', JSON.stringify(donors));
        localStorage.setItem('raon_budgets', JSON.stringify(budgets));

        if (clientId) localStorage.setItem('raon_client_id', clientId);
        localStorage.setItem('raon_auto_sync', JSON.stringify(autoSync));
    }, [transactions, donors, budgets, isLoaded, clientId, autoSync]);

    // Google Drive Handlers
    const handleConnectDrive = async () => {
        try {
            await GoogleDriveUtils.init(clientId);
            await GoogleDriveUtils.signIn();
            setIsDriveConnected(true);

            // Allow user to check for existing file
            const file = await GoogleDriveUtils.findFile();
            if (file) {
                if (window.confirm('구글 드라이브에 장부 데이터가 있습니다. 불러오시겠습니까? (현재 데이터는 덮어씌워집니다)')) {
                    await handleLoadFromDrive(file.id);
                }
            } else {
                alert('구글 계정이 연결되었습니다. 이제 데이터를 동기화할 수 있습니다.');
            }
        } catch (error) {
            console.error('Drive connection failed', error);
            alert('구글 계정 연결에 실패했습니다.');
        }
    };

    const handleDisconnectDrive = () => {
        GoogleDriveUtils.signOut();
        setIsDriveConnected(false);
        setAutoSync(false);
    };

    const handleLoadFromDrive = async (fileId) => {
        setIsSyncing(true);
        try {
            const data = await GoogleDriveUtils.loadFile(fileId || (await GoogleDriveUtils.findFile())?.id);
            if (data) {
                saveHistory();
                if (data.transactions) setTransactions(data.transactions);
                if (data.donors) setDonors(data.donors);
                if (data.budgets) setBudgets(data.budgets);
                setLastSyncTime(new Date());
                alert('구글 드라이브에서 데이터를 성공적으로 불러왔습니다.');
            }
        } catch (error) {
            console.error('Load failed', error);
            alert('데이터 불러오기에 실패했습니다.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncDrive = async () => {
        if (!isDriveConnected) return;
        setIsSyncing(true);
        try {
            const content = { transactions, donors, budgets };
            await GoogleDriveUtils.saveFile(content);
            setLastSyncTime(new Date());
        } catch (error) {
            console.error('Sync failed', error);
            alert('동기화에 실패했습니다.');
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-sync effect
    useEffect(() => {
        if (!isDriveConnected || !autoSync || !isLoaded) return;

        const timer = setTimeout(() => {
            handleSyncDrive();
        }, 5000); // Debounce 5 seconds

        return () => clearTimeout(timer);
    }, [transactions, donors, budgets, isDriveConnected, autoSync, isLoaded]);

    const saveHistory = () => {
        setHistory(prev => [JSON.stringify(transactions), ...prev].slice(0, 20));
    };

    const undo = () => {
        if (history.length === 0) return;
        const [lastState, ...remainingHistory] = history;
        setTransactions(JSON.parse(lastState));
        setHistory(remainingHistory);
    };

    const addTransaction = (newTx) => {
        saveHistory();
        setTransactions(prev => [newTx, ...prev]);
    };

    const deleteTransaction = (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            saveHistory();
            setTransactions(prev => prev.filter(tx => tx.id !== id));
        }
    };

    const updateTransaction = (id, updatedTx) => {
        saveHistory();
        setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updatedTx } : tx));
    };

    const renderSidebar = () => (
        <div className="sidebar">
            <div className="sidebar-header">
                <h1 className="church-title">라온동행교회</h1>
                <p className="church-subtitle">회계 관리 시스템</p>
            </div>
            <nav className="nav-menu">
                <button
                    className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    <LayoutDashboard size={20} /> 대시보드
                </button>
                <button
                    className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ledger')}
                >
                    <Table size={20} /> 장부 기록
                </button>
                <button
                    className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analysis')}
                >
                    <PieChart size={20} /> 통계 분석
                </button>
                <button
                    className={`nav-item ${activeTab === 'receipts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('receipts')}
                >
                    <Receipt size={20} /> 기부금 영수증
                </button>
                <button
                    className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <Settings size={20} /> 설정
                </button>
            </nav>
            <div className="sidebar-footer">
                <button className="sync-btn">
                    <Cloud size={18} /> Google Drive 동기화
                </button>
            </div>
        </div>
    );

    return (
        <div className="app-layout">
            {renderSidebar()}
            <main className="main-content">
                <header className="top-bar">
                    <div className="view-controls">
                        <button className="nav-btn" onClick={() => {
                            const nd = new Date(currentDate);
                            if (viewMode === VIEW_MODES.MONTHLY) nd.setMonth(nd.getMonth() - 1);
                            else if (viewMode === VIEW_MODES.YEARLY) nd.setFullYear(nd.getFullYear() - 1);
                            else if (viewMode === VIEW_MODES.DAILY) nd.setDate(nd.getDate() - 1);
                            setCurrentDate(nd);
                        }}>
                            <ChevronLeft size={18} />
                        </button>
                        <span className="current-date">
                            {viewMode === VIEW_MODES.MONTHLY && `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`}
                            {viewMode === VIEW_MODES.YEARLY && `${currentDate.getFullYear()}년`}
                            {viewMode === VIEW_MODES.DAILY && `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`}
                        </span>
                        <button className="nav-btn" onClick={() => {
                            const nd = new Date(currentDate);
                            if (viewMode === VIEW_MODES.MONTHLY) nd.setMonth(nd.getMonth() + 1);
                            else if (viewMode === VIEW_MODES.YEARLY) nd.setFullYear(nd.getFullYear() + 1);
                            else if (viewMode === VIEW_MODES.DAILY) nd.setDate(nd.getDate() + 1);
                            setCurrentDate(nd);
                        }}>
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="period-switcher">
                        {Object.values(VIEW_MODES).map(mode => (
                            <button
                                key={mode}
                                className={viewMode === mode ? 'active' : ''}
                                onClick={() => setViewMode(mode)}
                            >
                                {mode === 'DAILY' ? '일간' : mode === 'WEEKLY' ? '주간' : mode === 'MONTHLY' ? '월간' : '연간'}
                            </button>
                        ))}
                    </div>

                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="항목, 이름으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="user-profile">
                        <button
                            className={`undo-btn ${history.length === 0 ? 'disabled' : ''}`}
                            onClick={undo}
                            disabled={history.length === 0}
                            title="마지막 작업 되돌리기"
                        >
                            <Undo2 size={20} /> 되돌리기
                        </button>
                        <button className="add-tx-btn" onClick={() => setActiveTab('ledger')}>
                            <PlusCircle size={20} /> 새 항목 추가
                        </button>
                    </div>
                </header>

                <section className="content-area">
                    {activeTab === 'dashboard' && <DashboardView transactions={filteredByDateTransactions} />}
                    {activeTab === 'ledger' && (
                        <LedgerView
                            transactions={filteredByDateTransactions}
                            setTransactions={setTransactions}
                            deleteTransaction={deleteTransaction}
                            updateTransaction={updateTransaction}
                            donors={donors}
                            setDonors={setDonors}
                            searchTerm={searchTerm}
                            saveHistory={saveHistory}
                        />
                    )}
                    {activeTab === 'analysis' && <BudgetView budgets={budgets} setBudgets={setBudgets} transactions={filteredByDateTransactions} />}
                    {activeTab === 'receipts' && <ReceiptsView transactions={transactions} donors={donors} />}
                    {activeTab === 'settings' && (
                        <SettingsView
                            transactions={transactions}
                            setTransactions={setTransactions}
                            donors={donors}
                            setDonors={setDonors}
                            budgets={budgets}
                            setBudgets={setBudgets}
                            saveHistory={saveHistory}
                            clientId={clientId}
                            setClientId={setClientId}
                            isDriveConnected={isDriveConnected}
                            onConnectDrive={handleConnectDrive}
                            onDisconnectDrive={handleDisconnectDrive}
                            onSyncDrive={handleSyncDrive}
                            onLoadDrive={() => handleLoadFromDrive()}
                            lastSyncTime={lastSyncTime}
                            isSyncing={isSyncing}
                            autoSync={autoSync}
                            setAutoSync={setAutoSync}
                        />
                    )}
                </section>
            </main>
        </div>
    );
}

export default App;
