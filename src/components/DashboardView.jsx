import React, { useMemo } from 'react';
import {
    BarChart as BarChartIcon,
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Building,
    FileText
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

function DashboardView({ transactions, viewMode }) {
    const isYearly = viewMode === 'YEARLY';
    const periodLabel = isYearly ? '올해' : '이번 달';

    const stats = useMemo(() => {
        // Since transactions are already filtered by date in App.jsx, 
        // we aggregate everything passed here as the "current period"
        const periodIncome = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const periodExpense = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalIncome = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalExpense = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const specialIncome = transactions
            .filter(tx => tx.type === 'income' && tx.financeType === '특별재정')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const generalIncome = transactions
            .filter(tx => tx.type === 'income' && tx.financeType === '일반재정')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const specialExpense = transactions
            .filter(tx => tx.type === 'expense' && tx.financeType === '특별재정')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const generalExpense = transactions
            .filter(tx => tx.type === 'expense' && tx.financeType === '일반재정')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const periodCarryover = transactions
            .filter(tx => tx.type === 'income' && ['일반이월금', '특별이월금'].includes(tx.category))
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalCarryover = transactions
            .filter(tx => tx.type === 'income' && ['일반이월금', '특별이월금'].includes(tx.category))
            .reduce((sum, tx) => sum + tx.amount, 0);

        return {
            periodIncome,
            periodExpense,
            totalIncome,
            totalExpense,
            specialIncome,
            generalIncome,
            specialExpense,
            generalExpense,
            periodCarryover,
            totalCarryover,
            periodPureIncome: periodIncome - periodCarryover,
            totalPureIncome: totalIncome - totalCarryover
        };
    }, [transactions]);

    const barData = {
        labels: ['총 수입', '총 지출'],
        datasets: [
            {
                label: '금액',
                data: [stats.totalIncome, stats.totalExpense],
                backgroundColor: ['#4f46e5', '#10b981'],
                borderRadius: 8,
            },
        ],
    };

    const incomeByCategory = useMemo(() => {
        const data = {};
        transactions
            .filter(tx => tx.type === 'income')
            .forEach(tx => {
                data[tx.category] = (data[tx.category] || 0) + tx.amount;
            });
        return data;
    }, [transactions]);

    const expenseByCategory = useMemo(() => {
        const data = {};
        transactions
            .filter(tx => tx.type === 'expense')
            .forEach(tx => {
                data[tx.category] = (data[tx.category] || 0) + tx.amount;
            });
        return data;
    }, [transactions]);

    const pieData = {
        labels: Object.keys(incomeByCategory),
        datasets: [
            {
                data: Object.values(incomeByCategory),
                backgroundColor: [
                    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                ],
            },
        ],
    };

    const handlePrintReport = () => {
        let periodStr = "";
        if (transactions.length > 0) {
            const firstDate = new Date(transactions[transactions.length - 1].date);
            periodStr = viewMode === 'YEARLY' ? `${firstDate.getFullYear()}년 전체` : `${firstDate.getFullYear()}년 ${firstDate.getMonth() + 1}월`;
        } else {
            const now = new Date();
            periodStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
        }

        const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        const balanceV = stats.totalIncome - stats.totalExpense;
        const assetsV = 10000000;

        const incomeTableRows = Object.entries(incomeByCategory).map(([cat, amt]) => `
            <tr><td>${cat}</td><td class="amount">${amt.toLocaleString()} 원</td></tr>
        `).join('');

        const expenseTableRows = Object.entries(expenseByCategory).map(([cat, amt]) => `
            <tr><td>${cat}</td><td class="amount">${amt.toLocaleString()} 원</td></tr>
        `).join('');

        const expenseItems = [...transactions]
            .filter(tx => tx.type === 'expense')
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const ledgerRows = expenseItems.map(item => `
            <tr>
                <td style="text-align: center">${item.date}</td>
                <td>${item.category}</td>
                <td style="text-align: center">${item.name}</td>
                <td class="amount">${(item.amount || 0).toLocaleString()}</td>
                <td style="white-space: normal">${item.note || ''}</td>
            </tr>
        `).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>라온동행교회 재정보고서 (${periodStr})</title>
                <style>
                    body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 40px; color: #1e293b; }
                    .report-wrapper { max-width: 850px; margin: 0 auto; }
                    h1 { text-align: center; margin-bottom: 5px; }
                    .period { text-align: center; font-size: 1.4rem; font-weight: bold; margin-bottom: 30px; }
                    .section { margin-bottom: 40px; page-break-inside: avoid; }
                    .section-title { font-size: 1.2rem; font-weight: bold; border-left: 5px solid #000; padding-left: 10px; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 5px; table-layout: fixed; }
                    th, td { border: 1px solid #000; padding: 8px; font-size: 0.9rem; }
                    th { background: #f8fafc; }
                    .amount { text-align: right; }
                    .total-row { background: #f1f5f9; font-weight: bold; }
                    .footer { margin-top: 60px; text-align: center; }
                    .sign { margin-top: 40px; display: flex; justify-content: center; gap: 50px; }
                    .ver { font-size: 0.7rem; color: #ccc; text-align: right; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="report-wrapper">
                    <h1>라온동행교회 재정보고서</h1>
                    <div class="period">${periodStr}</div>
                    
                    <div class="section">
                        <div class="section-title">1. 종합 재정 현황</div>
                        <table>
                            <tr><th style="width: 70%">항목</th><th>금액</th></tr>
                            <tr style="background: #eff6ff"><td><strong>[수입 총합계]</strong> (이월금 포함)</td><td class="amount"><strong>${stats.totalIncome.toLocaleString()} 원</strong></td></tr>
                            <tr style="color: #64748b"><td>- 당기 순수입 (이월금 제외)</td><td class="amount">${stats.totalPureIncome.toLocaleString()} 원</td></tr>
                            <tr style="color: #64748b"><td>- 전년 이월금 합계</td><td class="amount">${stats.totalCarryover.toLocaleString()} 원</td></tr>
                            <tr style="background: #fef2f2"><td><strong>[지출 총합계]</strong></td><td class="amount"><strong>${stats.totalExpense.toLocaleString()} 원</strong></td></tr>
                            <tr class="total-row" style="background: #f0fdf4"><td><strong>[현재 잔액]</strong> (가용 자산)</td><td class="amount">${balanceV.toLocaleString()} 원</td></tr>
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-title">2. 항목별 수입 내역</div>
                        <table>
                            <tr><th>항목(계정)</th><th>금액</th></tr>
                            ${incomeTableRows || '<tr><td colspan="2" style="text-align:center">내역 없음</td></tr>'}
                            <tr class="total-row"><td>수입 합계</td><td class="amount">${stats.totalIncome.toLocaleString()} 원</td></tr>
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-title">3. 항목별 지출 내역</div>
                        <table>
                            <tr><th>항목(계정)</th><th>금액</th></tr>
                            ${expenseTableRows || '<tr><td colspan="2" style="text-align:center">내역 없음</td></tr>'}
                            <tr class="total-row"><td>지출 합계</td><td class="amount">${stats.totalExpense.toLocaleString()} 원</td></tr>
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-title">4. 지출부 상세 내역</div>
                        <table style="font-size: 0.8rem">
                            <thead>
                                <tr><th style="width: 15%">일자</th><th style="width: 20%">항목</th><th style="width: 15%">성명</th><th style="width: 20%">금액</th><th>비고</th></tr>
                            </thead>
                            <tbody>
                                ${ledgerRows || '<tr><td colspan="5" style="text-align:center">내역 없음</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-title">5. 교회 자산 현황</div>
                        <table>
                            <tr><td>부동산 임대보증금</td><td class="amount">${assetsV.toLocaleString()} 원</td></tr>
                            <tr class="total-row"><td>총 자산 (잔액+보증금)</td><td class="amount">${(balanceV + assetsV).toLocaleString()} 원</td></tr>
                        </table>
                    </div>

                    <div class="footer">
                        <p>위와 같이 보고합니다.</p>
                        <p>${dateStr}</p>
                        <div class="sign">
                            <span>재정 위원: ____________ (인)</span>
                            <span>담임 목사: ____________ (인)</span>
                        </div>
                    </div>
                    <div class="ver">ver 1.2</div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>재정 대시보드</h2>
                <button
                    onClick={handlePrintReport}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        color: '#475569'
                    }}
                >
                    <FileText size={18} />
                    재정보고서 출력
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">{periodLabel} 수입</span>
                        <div className="stat-icon income"><TrendingUp size={16} /></div>
                    </div>
                    <div className="stat-value">₩ {stats.periodIncome.toLocaleString()}</div>
                    <div className="stat-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <div style={{ color: '#4b5563', fontSize: '0.8rem' }}>
                            (이월 제외: ₩ {stats.periodPureIncome.toLocaleString()})
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', marginTop: '2px' }}>
                            <span style={{ color: '#6366f1' }}>일반: {stats.generalIncome.toLocaleString()}</span>
                            <span style={{ color: '#8b5cf6' }}>특별: {stats.specialIncome.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">{periodLabel} 지출</span>
                        <div className="stat-icon expense"><TrendingDown size={16} /></div>
                    </div>
                    <div className="stat-value">₩ {stats.periodExpense.toLocaleString()}</div>
                    <div className="stat-footer negative">
                        <ArrowDownRight size={14} /> 지출 관리 필요
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">현재 잔액</span>
                        <div className="stat-icon balance"><Wallet size={16} /></div>
                    </div>
                    <div className="stat-value primary">₩ {(stats.totalIncome - stats.totalExpense).toLocaleString()}</div>
                    <div className="stat-footer text-muted">전체 누적 기준</div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="stat-header">
                        <span className="stat-label">교회 자산 (부동산)</span>
                        <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Building size={16} /></div>
                    </div>
                    <div className="stat-value" style={{ color: '#d97706' }}>₩ 10,000,000</div>
                    <div className="stat-footer text-muted">
                        임대 보증금
                    </div>
                </div>
            </div>

            <div className="charts-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                <div className="chart-card">
                    <h3>수입 vs 지출 현황</h3>
                    <div style={{ height: '300px' }}>
                        <Bar
                            data={barData}
                            options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                        />
                    </div>
                </div>
                <div className="chart-card">
                    <h3>수입 항목별 비중</h3>
                    <div style={{ height: '300px' }}>
                        {Object.keys(incomeByCategory).length > 0 ? (
                            <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                        ) : (
                            <div className="empty-chart">데이터가 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardView;
