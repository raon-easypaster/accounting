import React, { useState, useMemo } from 'react';
import { Search, Printer, FileText, Download, ArrowUpDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function ReceiptsView({ transactions, donors }) {
    const [selectedDonor, setSelectedDonor] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const availableYears = useMemo(() => {
        const years = new Set(transactions.map(tx => new Date(tx.date).getFullYear().toString()));
        // Ensure current year is included even if no transactions
        years.add(new Date().getFullYear().toString());
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    const filteredDonors = useMemo(() => {
        return donors.filter(name => name.includes(searchQuery));
    }, [donors, searchQuery]);

    const donorStats = useMemo(() => {
        if (!selectedDonor) return null;
        const donorTxs = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return tx.name === selectedDonor &&
                tx.type === 'income' &&
                txDate.getFullYear().toString() === selectedYear;
        });
        const total = donorTxs.reduce((sum, tx) => sum + tx.amount, 0);
        return { transactions: donorTxs, total };
    }, [selectedDonor, transactions, selectedYear]);

    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const sortedTransactions = useMemo(() => {
        if (!donorStats) return [];
        return [...donorStats.transactions].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (sortBy === 'amount') {
                aVal = Number(aVal || 0);
                bVal = Number(bVal || 0);
            } else if (sortBy === 'date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [donorStats, sortBy, sortOrder]);

    const generatePDF = () => {
        if (!selectedDonor || !donorStats) return;

        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text('기 부 금 영 수 증', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`성 명: ${selectedDonor}`, 20, 40);
        doc.text(`기 관 명: 라온동행교회`, 20, 50);
        doc.text(`발행년도: ${selectedYear}년`, 20, 60);
        doc.text(`발행일자: ${new Date().toLocaleDateString()}`, 20, 70);

        const tableData = sortedTransactions.map(tx => [
            tx.date,
            tx.financeType || '-',
            tx.category,
            tx.amount.toLocaleString() + '원'
        ]);

        doc.autoTable({
            startY: 80,
            head: [['일자', '재정구분', '항목', '금액']],
            body: tableData,
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text(`총 합계: ${donorStats.total.toLocaleString()}원`, 190, finalY, { align: 'right' });

        doc.setFontSize(10);
        doc.text('위와 같이 기부금을 영수함', 105, finalY + 40, { align: 'center' });
        doc.text('라온동행교회 담임목사 (인)', 105, finalY + 50, { align: 'center' });

        doc.save(`${selectedDonor}_${selectedYear}년_기부금영수증.pdf`);
    };

    return (
        <div className="receipts-container">
            <div className="receipts-header">
                <h2>기부금 영수증 발행</h2>
                <p className="text-muted">교인별 헌금 내역을 확인하고 영수증을 출력할 수 있습니다.</p>
            </div>

            <div className="receipts-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', marginTop: '2rem' }}>
                <div className="donor-selector card shadow-sm p-4" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>조회 연도 선택</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                                fontSize: '0.9rem',
                                background: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}년</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>헌금자 검색</label>
                        <div className="search-bar" style={{ width: '100%', marginBottom: '1rem' }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="이름 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="donor-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {filteredDonors.map(name => (
                            <div
                                key={name}
                                className={`donor-item ${selectedDonor === name ? 'active' : ''}`}
                                onClick={() => setSelectedDonor(name)}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    marginBottom: '0.25rem',
                                    backgroundColor: selectedDonor === name ? '#eef2ff' : 'transparent',
                                    color: selectedDonor === name ? '#4f46e5' : 'inherit',
                                    fontWeight: selectedDonor === name ? '700' : '400'
                                }}
                            >
                                {name}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="donor-preview card shadow-sm p-4" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                    {selectedDonor ? (
                        <div className="preview-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3>{selectedDonor} 님의 {selectedYear}년 기부 내역</h3>
                                <button className="add-btn" onClick={generatePDF}>
                                    <Download size={18} /> PDF 다운로드
                                </button>
                            </div>

                            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '2rem' }}>
                                <div className="stat-card" style={{ padding: '1rem' }}>
                                    <div className="stat-label">기부 횟수</div>
                                    <div className="stat-value" style={{ fontSize: '1.25rem' }}>{donorStats.transactions.length}회</div>
                                </div>
                                <div className="stat-card" style={{ padding: '1rem' }}>
                                    <div className="stat-label">총 기부 금액</div>
                                    <div className="stat-value primary" style={{ fontSize: '1.25rem' }}>₩ {donorStats.total.toLocaleString()}</div>
                                </div>
                            </div>

                            <table className="ledger-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                            날짜 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'date' ? 1 : 0.3 }} />
                                        </th>
                                        <th onClick={() => handleSort('financeType')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                            재정구분 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'financeType' ? 1 : 0.3 }} />
                                        </th>
                                        <th onClick={() => handleSort('category')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                            항목 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'category' ? 1 : 0.3 }} />
                                        </th>
                                        <th className="text-right" onClick={() => handleSort('amount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                            금액 <ArrowUpDown size={14} style={{ display: 'inline', opacity: sortBy === 'amount' ? 1 : 0.3 }} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedTransactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td>{tx.date}</td>
                                            <td className="text-muted" style={{ fontSize: '0.8rem' }}>{tx.financeType || '-'}</td>
                                            <td>{tx.category}</td>
                                            <td className="text-right">{tx.amount.toLocaleString()}원</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem 0' }}>
                            <FileText size={48} style={{ margin: '0 auto 1rem' }} />
                            <p>기부금 영수증을 발행할 인원을 왼쪽 목록에서 선택해 주세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReceiptsView;
