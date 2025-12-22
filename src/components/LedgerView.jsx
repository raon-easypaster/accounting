import React, { useState } from 'react';
import {
    PlusCircle,
    Trash2,
    Download,
    ChevronLeft,
    ChevronRight,
    UserPlus,
    Upload,
    Edit,
    ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, FINANCE_TYPES } from '../constants/ledgerConstants';
import { matchHangul } from '../utils/hangulUtils';

function LedgerView({ transactions, setTransactions, deleteTransaction, updateTransaction, donors, setDonors, searchTerm, saveHistory }) {
    const [showForm, setShowForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [txType, setTxType] = useState('income');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [rows, setRows] = useState(Array.from({ length: 10 }, (_, i) => ({
        id: Date.now() + i,
        date: new Date().toISOString().split('T')[0],
        financeType: FINANCE_TYPES.GENERAL,
        category: '',
        name: '',
        amount: '',
        note: '',
        isCustomName: false,
        customName: '',
        showSuggestions: false
    })));

    const addRow = () => {
        setRows(prev => {
            const lastRow = prev[prev.length - 1];
            return [...prev, {
                id: Date.now(),
                date: lastRow?.date || new Date().toISOString().split('T')[0],
                financeType: lastRow?.financeType || FINANCE_TYPES.GENERAL,
                category: '',
                name: '',
                amount: '',
                note: '',
                isCustomName: false,
                customName: '',
                showSuggestions: false
            }];
        });
    };

    const removeRow = (id) => {
        setRows(prev => {
            if (prev.length > 1) {
                return prev.filter(row => row.id !== id);
            }
            return prev;
        });
    };

    const updateRow = (id, field, value) => {
        setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleAddTxs = (e) => {
        e.preventDefault();
        const newTxs = rows.map(row => ({
            id: row.id,
            date: row.date,
            type: txType,
            financeType: row.financeType,
            category: row.category,
            name: row.isCustomName ? row.customName : row.name,
            amount: Number(row.amount),
            note: row.note
        })).filter(tx => tx.category && tx.name && tx.amount > 0);

        if (newTxs.length === 0) {
            alert("유효한 입력 항목이 없습니다. 항목, 이름, 금액을 확인해 주세요.");
            return;
        }

        // Handle new donor names
        const newDonorsSet = new Set(donors);
        let donorsChanged = false;
        rows.forEach(row => {
            if (row.isCustomName && row.customName && !newDonorsSet.has(row.customName)) {
                newDonorsSet.add(row.customName);
                donorsChanged = true;
            }
        });

        if (donorsChanged) {
            setDonors(Array.from(newDonorsSet).sort((a, b) => a.localeCompare(b, 'ko')));
        }

        saveHistory();
        setTransactions(prev => [...newTxs, ...prev]);
        setShowForm(false);
        resetForm();
    };

    const exportToExcel = () => {
        if (transactions.length === 0) {
            alert("내보낼 데이터가 없습니다.");
            return;
        }

        const data = transactions.map(tx => ({
            날짜: tx.date,
            구분: tx.type === 'income' ? '수입' : '지출',
            항목: tx.category,
            '내역/이름': tx.name,
            수입: tx.type === 'income' ? tx.amount : 0,
            지출: tx.type === 'expense' ? tx.amount : 0,
            비고: tx.note
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "장부기록");
        XLSX.writeFile(workbook, `라온동행교회_장부_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const importFromExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const importedTxs = data.map((row, index) => {
                    // Try to find values using multiple common header aliases
                    const getVal = (aliases) => {
                        const key = aliases.find(a => row[a] !== undefined);
                        return key ? row[key] : null;
                    };

                    const rawDate = getVal(['날짜', '일자', 'date', 'Date']);
                    const rawType = getVal(['구분', 'type', 'Type']);
                    const rawCategory = getVal(['항목', '분류', 'category', 'Category']) || '기타';
                    const rawName = getVal(['내역/이름', '내역', '이름', '성명', 'name', 'Name']) || '이름없음';

                    // Handle both separate income/expense columns and single amount column
                    const rawIncome = Number(getVal(['수입', 'income', 'Income'])) || 0;
                    const rawExpense = Number(getVal(['지출', 'expense', 'Expense'])) || 0;
                    const rawAmount = Number(getVal(['금액', 'amount', 'Amount'])) || 0;

                    const rawNote = getVal(['비고', '메모', 'note', 'Note']) || '';
                    const rawFinance = getVal(['재정구분', '재정', 'finance']);

                    // Determine type and amount
                    let type, amount;
                    if (rawIncome > 0) {
                        type = 'income';
                        amount = rawIncome;
                    } else if (rawExpense > 0) {
                        type = 'expense';
                        amount = rawExpense;
                    } else if (rawAmount > 0) {
                        type = (rawType === '지출' || rawType === 'expense') ? 'expense' : 'income';
                        amount = rawAmount;
                    } else {
                        type = (rawType === '지출' || rawType === 'expense') ? 'expense' : 'income';
                        amount = 0;
                    }

                    // Logic to determine financeType if not provided
                    let financeType = rawFinance;
                    if (!financeType) {
                        // Guess based on categorory if it exists in constants
                        const isSpecialIncome = INCOME_CATEGORIES['특별재정'].includes(rawCategory);
                        const isSpecialExpense = EXPENSE_CATEGORIES['특별재정'].includes(rawCategory);
                        financeType = (isSpecialIncome || isSpecialExpense) ? FINANCE_TYPES.SPECIAL : FINANCE_TYPES.GENERAL;
                    }

                    return {
                        id: Date.now() + index,
                        date: rawDate || new Date().toISOString().split('T')[0],
                        type: type,
                        financeType: financeType,
                        category: rawCategory,
                        name: rawName,
                        amount: Math.abs(amount),
                        note: rawNote
                    };
                });

                if (importedTxs.length > 0) {
                    saveHistory();
                    setTransactions(prev => [...importedTxs, ...prev]);
                    alert(`${importedTxs.length}건의 데이터를 성공적으로 가져와 저장했습니다.`);
                }
            } catch (err) {
                console.error("Excel Import Error:", err);
                alert("엑셀 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해 주세요.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const resetForm = () => {
        setRows(Array.from({ length: 10 }, (_, i) => ({
            id: Date.now() + i,
            date: new Date().toISOString().split('T')[0],
            financeType: FINANCE_TYPES.GENERAL,
            category: '',
            name: '',
            amount: '',
            note: '',
            isCustomName: false,
            customName: '',
            showSuggestions: false
        })));
    };

    const filteredTransactions = React.useMemo(() => {
        if (!searchTerm) return transactions;
        const lowerSearch = searchTerm.toLowerCase();
        return transactions.filter(tx =>
            tx.name.toLowerCase().includes(lowerSearch) ||
            tx.category.toLowerCase().includes(lowerSearch) ||
            tx.note.toLowerCase().includes(lowerSearch) ||
            tx.amount.toString().includes(lowerSearch)
        );
    }, [transactions, searchTerm]);

    const handleEdit = (tx) => {
        setEditingTx(tx);
        setShowEditForm(true);
    };

    const handleUpdateTx = (e) => {
        e.preventDefault();
        if (!editingTx) return;

        updateTransaction(editingTx.id, {
            date: editingTx.date,
            type: editingTx.type,
            financeType: editingTx.financeType,
            category: editingTx.category,
            name: editingTx.name,
            amount: Number(editingTx.amount),
            note: editingTx.note
        });

        setShowEditForm(false);
        setEditingTx(null);
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const sortedTransactions = React.useMemo(() => {
        const sorted = [...filteredTransactions].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (sortBy === 'amount') {
                aVal = Number(aVal);
                bVal = Number(bVal);
            } else if (sortBy === 'date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredTransactions, sortBy, sortOrder]);

    // Calculate subtotals
    const subtotals = React.useMemo(() => {
        const generalIncome = sortedTransactions
            .filter(tx => tx.type === 'income' && tx.financeType === FINANCE_TYPES.GENERAL)
            .reduce((sum, tx) => sum + tx.amount, 0);
        const generalExpense = sortedTransactions
            .filter(tx => tx.type === 'expense' && tx.financeType === FINANCE_TYPES.GENERAL)
            .reduce((sum, tx) => sum + tx.amount, 0);
        const specialIncome = sortedTransactions
            .filter(tx => tx.type === 'income' && tx.financeType === FINANCE_TYPES.SPECIAL)
            .reduce((sum, tx) => sum + tx.amount, 0);
        const specialExpense = sortedTransactions
            .filter(tx => tx.type === 'expense' && tx.financeType === FINANCE_TYPES.SPECIAL)
            .reduce((sum, tx) => sum + tx.amount, 0);

        return {
            generalIncome,
            generalExpense,
            generalBalance: generalIncome - generalExpense,
            specialIncome,
            specialExpense,
            specialBalance: specialIncome - specialExpense,
            totalIncome: generalIncome + specialIncome,
            totalExpense: generalExpense + specialExpense,
            totalBalance: (generalIncome + specialIncome) - (generalExpense + specialExpense)
        };
    }, [sortedTransactions]);

    return (
        <div className="ledger-container">
            <div className="ledger-header">
                <h2>장부 기록</h2>
                <div className="header-actions">
                    <div style={{ position: 'relative' }}>
                        <button className="export-btn">
                            <Upload size={18} /> Excel 가져오기
                        </button>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={importFromExcel}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        />
                    </div>
                    <button className="export-btn" onClick={exportToExcel}>
                        <Download size={18} /> Excel 내보내기
                    </button>
                    <button className="add-btn" onClick={() => setShowForm(true)}>
                        <PlusCircle size={18} /> 기록 추가
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>새로운 {txType === 'income' ? '수입' : '지출'} 추가</h3>
                            <div className="type-toggle">
                                <button
                                    className={txType === 'income' ? 'active' : ''}
                                    onClick={() => setTxType('income')}
                                >
                                    수입
                                </button>
                                <button
                                    className={txType === 'expense' ? 'active' : ''}
                                    onClick={() => setTxType('expense')}
                                >
                                    지출
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddTxs} className="ledger-form bulk-form">
                            <div className="bulk-rows-container">
                                {rows.map((row, index) => (
                                    <div key={row.id} className="bulk-row">
                                        <div className="row-number">{index + 1}</div>
                                        <div className="form-group">
                                            <input
                                                type="date"
                                                value={row.date}
                                                onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <select
                                                value={row.financeType}
                                                onChange={(e) => updateRow(row.id, 'financeType', e.target.value)}
                                            >
                                                <option value={FINANCE_TYPES.GENERAL}>{FINANCE_TYPES.GENERAL}</option>
                                                <option value={FINANCE_TYPES.SPECIAL}>{FINANCE_TYPES.SPECIAL}</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <select
                                                value={row.category}
                                                onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                                            >
                                                <option value="">항목선택</option>
                                                {(txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[row.financeType].map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group name-col">
                                            {txType === 'income' ? (
                                                <div className="searchable-name-container">
                                                    <input
                                                        type="text"
                                                        placeholder="헌금자(초성검색)"
                                                        value={row.name}
                                                        onChange={(e) => {
                                                            updateRow(row.id, 'name', e.target.value);
                                                            updateRow(row.id, 'showSuggestions', true);
                                                        }}
                                                        onBlur={() => {
                                                            // Small delay to allow clicking on a suggestion
                                                            setTimeout(() => updateRow(row.id, 'showSuggestions', false), 200);
                                                        }}
                                                        onFocus={() => updateRow(row.id, 'showSuggestions', true)}
                                                    />
                                                    {row.showSuggestions && row.name && (
                                                        <div className="name-suggestions">
                                                            {donors
                                                                .filter(d => matchHangul(d, row.name))
                                                                .slice(0, 10)
                                                                .map(d => (
                                                                    <div
                                                                        key={d}
                                                                        className="suggestion-item"
                                                                        onClick={() => {
                                                                            updateRow(row.id, 'name', d);
                                                                            updateRow(row.id, 'showSuggestions', false);
                                                                        }}
                                                                    >
                                                                        {d}
                                                                    </div>
                                                                ))}
                                                            {!donors.some(d => d === row.name) && (
                                                                <div
                                                                    className="suggestion-item add-new-suggestion"
                                                                    onClick={() => {
                                                                        updateRow(row.id, 'isCustomName', true);
                                                                        updateRow(row.id, 'customName', row.name);
                                                                        updateRow(row.id, 'showSuggestions', false);
                                                                    }}
                                                                >
                                                                    + '{row.name}' 신규 등록
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="사용처..."
                                                    value={row.name}
                                                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                                />
                                            )}
                                        </div>

                                        <div className="form-group amount-col">
                                            <input
                                                type="number"
                                                placeholder="금액"
                                                value={row.amount}
                                                onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                                            />
                                        </div>

                                        <div className="form-group note-col">
                                            <input
                                                type="text"
                                                placeholder="메모"
                                                value={row.note}
                                                onChange={(e) => updateRow(row.id, 'note', e.target.value)}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="row-delete-btn"
                                            onClick={() => removeRow(row.id)}
                                            disabled={rows.length === 1}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button type="button" className="add-row-btn" onClick={addRow}>
                                <PlusCircle size={16} /> 줄 추가하기
                            </button>

                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>취소</button>
                                <button type="submit" className="submit-btn">{rows.length}건 일괄 저장</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditForm && editingTx && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3>기록 수정</h3>
                        </div>

                        <form onSubmit={handleUpdateTx} className="ledger-form" style={{ padding: '1.5rem' }}>
                            <div className="form-group">
                                <label>날짜</label>
                                <input
                                    type="date"
                                    value={editingTx.date}
                                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>구분</label>
                                <select
                                    value={editingTx.type}
                                    onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value })}
                                    required
                                >
                                    <option value="income">수입</option>
                                    <option value="expense">지출</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>재정구분</label>
                                <select
                                    value={editingTx.financeType}
                                    onChange={(e) => setEditingTx({ ...editingTx, financeType: e.target.value })}
                                    required
                                >
                                    <option value={FINANCE_TYPES.GENERAL}>{FINANCE_TYPES.GENERAL}</option>
                                    <option value={FINANCE_TYPES.SPECIAL}>{FINANCE_TYPES.SPECIAL}</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>항목</label>
                                <select
                                    value={editingTx.category}
                                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                                    required
                                >
                                    <option value="">항목선택</option>
                                    {(editingTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[editingTx.financeType]?.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{editingTx.type === 'income' ? '헌금자' : '사용처'}</label>
                                <input
                                    type="text"
                                    value={editingTx.name}
                                    onChange={(e) => setEditingTx({ ...editingTx, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>금액</label>
                                <input
                                    type="number"
                                    value={editingTx.amount}
                                    onChange={(e) => setEditingTx({ ...editingTx, amount: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>비고</label>
                                <input
                                    type="text"
                                    value={editingTx.note || ''}
                                    onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value })}
                                />
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="cancel-btn" onClick={() => { setShowEditForm(false); setEditingTx(null); }}>취소</button>
                                <button type="submit" className="submit-btn">수정 완료</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {sortedTransactions.length > 0 && (
                <div className="subtotals-summary" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div className="subtotal-card">
                        <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>일반재정</h4>
                        <div style={{ fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>수입:</span>
                                <span className="income-text">{subtotals.generalIncome.toLocaleString()}원</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>지출:</span>
                                <span className="expense-text">{subtotals.generalExpense.toLocaleString()}원</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                                <span>잔액:</span>
                                <span style={{ color: subtotals.generalBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                    {subtotals.generalBalance.toLocaleString()}원
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="subtotal-card">
                        <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>특별재정</h4>
                        <div style={{ fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>수입:</span>
                                <span className="income-text">{subtotals.specialIncome.toLocaleString()}원</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>지출:</span>
                                <span className="expense-text">{subtotals.specialExpense.toLocaleString()}원</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                                <span>잔액:</span>
                                <span style={{ color: subtotals.specialBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                    {subtotals.specialBalance.toLocaleString()}원
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="subtotal-card">
                        <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>전체 합계</h4>
                        <div style={{ fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>수입:</span>
                                <span className="income-text">{subtotals.totalIncome.toLocaleString()}원</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>지출:</span>
                                <span className="expense-text">{subtotals.totalExpense.toLocaleString()}원</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                                <span>잔액:</span>
                                <span style={{ color: subtotals.totalBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                    {subtotals.totalBalance.toLocaleString()}원
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="ledger-table-container">
                <table className="ledger-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                                날짜 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'date' ? 1 : 0.3 }} />
                            </th>
                            <th onClick={() => handleSort('financeType')} style={{ cursor: 'pointer' }}>
                                재정구분 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'financeType' ? 1 : 0.3 }} />
                            </th>
                            <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                                구분 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'type' ? 1 : 0.3 }} />
                            </th>
                            <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                                항목 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'category' ? 1 : 0.3 }} />
                            </th>
                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                내역/이름 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'name' ? 1 : 0.3 }} />
                            </th>
                            <th className="text-right" onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                                수입 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'amount' ? 1 : 0.3 }} />
                            </th>
                            <th className="text-right" onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                                지출 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'amount' ? 1 : 0.3 }} />
                            </th>
                            <th onClick={() => handleSort('note')} style={{ cursor: 'pointer' }}>
                                비고 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'note' ? 1 : 0.3 }} />
                            </th>
                            <th width="80"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="empty-row">기록된 내역이 없습니다.</td>
                            </tr>
                        ) : (
                            sortedTransactions.map(tx => (
                                <tr key={tx.id}>
                                    <td>{tx.date}</td>
                                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>{tx.financeType || '-'}</td>
                                    <td>
                                        <span className={`badge ${tx.type}`}>
                                            {tx.type === 'income' ? '수입' : '지출'}
                                        </span>
                                    </td>
                                    <td>{tx.category}</td>
                                    <td className="font-bold">{tx.name}</td>
                                    <td className="text-right income-text">
                                        {tx.type === 'income' ? tx.amount.toLocaleString() : '-'}
                                    </td>
                                    <td className="text-right expense-text">
                                        {tx.type === 'expense' ? tx.amount.toLocaleString() : '-'}
                                    </td>
                                    <td className="text-muted">{tx.note}</td>
                                    <td>
                                        <button
                                            className="edit-btn"
                                            onClick={() => handleEdit(tx)}
                                            style={{ marginRight: '0.5rem' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => deleteTransaction(tx.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default LedgerView;
