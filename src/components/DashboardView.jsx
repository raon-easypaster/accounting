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
        const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

        // Calculate totals for report
        const totalIncomeV = stats.totalIncome;
        const totalExpenseV = stats.totalExpense;
        const balanceV = totalIncomeV - totalExpenseV;
        const assetsV = 10000000; // Real estate deposit

        const pureIncomeV = stats.totalPureIncome;
        const carryoverV = stats.totalCarryover;

        const generalIncomeV = stats.generalIncome;
        const specialIncomeV = stats.specialIncome;
        const generalExpenseV = stats.generalExpense;
        const specialExpenseV = stats.specialExpense;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>라온동행교회 재정보고서 - ${dateStr}</title>
                <style>
                    body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; line-height: 1.6; color: #334155; }
                    h1 { text-align: center; color: #0f172a; margin-bottom: 5px; font-size: 2rem; }
                    .date { text-align: center; color: #64748b; margin-bottom: 40px; font-size: 1rem; }
                    .section { margin-bottom: 35px; }
                    .section-name { font-size: 1.25rem; font-weight: 700; border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
                    th { background-color: #f8fafc; text-align: center; color: #475569; font-weight: 600; }
                    .amount { text-align: right; font-weight: 600; font-family: 'Consolas', monospace; }
                    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .total-row { background-color: #f0fdf4; font-weight: 700; }
                    .sub-row { color: #64748b; font-size: 0.9rem; background-color: #fafafa; }
                    .sub-row td:first-child { padding-left: 30px; }
                    .footer { margin-top: 60px; text-align: center; font-size: 1rem; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 30px; }
                </style>
            </head>
            <body>
                <h1>라온동행교회 재정보고서</h1>
                <p class="date">기준일: ${dateStr}</p>

                <div class="section">
                    <div class="section-name">1. 전체 재정 현황</div>
                    <table>
                        <thead>
                            <tr>
                                <th>구분</th>
                                <th style="text-align: right">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>수입 총계</strong> (이월금 포함)</td>
                                <td class="amount" style="color: #2563eb; font-size: 1.1rem;">${totalIncomeV.toLocaleString()} 원</td>
                            </tr>
                            <tr class="sub-row">
                                <td>- 순수입 계 (일반+특별)</td>
                                <td class="amount">${pureIncomeV.toLocaleString()} 원</td>
                            </tr>
                            <tr class="sub-row">
                                <td>└ 일반재정 순수입</td>
                                <td class="amount">${(generalIncomeV - (transactions.filter(t => t.type === 'income' && t.financeType === '일반재정' && t.category === '일반이월금').reduce((s, t) => s + t.amount, 0))).toLocaleString()} 원</td>
                            </tr>
                            <tr class="sub-row">
                                <td>└ 특별재정 순수입</td>
                                <td class="amount">${(specialIncomeV - (transactions.filter(t => t.type === 'income' && t.financeType === '특별재정' && t.category === '특별이월금').reduce((s, t) => s + t.amount, 0))).toLocaleString()} 원</td>
                            </tr>
                            <tr class="sub-row">
                                <td>- 전년 이월금 (일반+특별)</td>
                                <td class="amount">${carryoverV.toLocaleString()} 원</td>
                            </tr>

                            <tr>
                                <td style="padding-top: 20px;"><strong>지출 총계</strong></td>
                                <td class="amount" style="color: #dc2626; font-size: 1.1rem; padding-top: 20px;">${totalExpenseV.toLocaleString()} 원</td>
                            </tr>
                            <tr class="sub-row">
                                <td>- 일반재정 지출</td>
                                <td class="amount">${generalExpenseV.toLocaleString()} 원</td>
                            </tr>
                            <tr class="sub-row">
                                <td>- 특별재정 지출</td>
                                <td class="amount">${specialExpenseV.toLocaleString()} 원</td>
                            </tr>

                            <tr class="total-row" style="border-top: 2px solid #0f172a;">
                                <td style="font-size: 1.1rem;">현재 잔액 (수입 - 지출)</td>
                                <td class="amount" style="color: ${balanceV >= 0 ? '#16a34a' : '#dc2626'}; font-size: 1.2rem;">${balanceV.toLocaleString()} 원</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <div class="section-name">2. 자산 현황</div>
                    <table>
                        <thead>
                            <tr>
                                <th>자산명</th>
                                <th style="text-align: right">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>부동산 임대보증금</td>
                                <td class="amount">${assetsV.toLocaleString()} 원</td>
                            </tr>
                            <tr class="total-row">
                                <td>총 자산 (잔액 포함)</td>
                                <td class="amount">${(balanceV + assetsV).toLocaleString()} 원</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                    <div class="section">
                        <div class="section-name">3. 세부 수입 내역</div>
                        <table>
                            <tr>
                                <th>항목</th>
                                <th style="text-align: right">금액</th>
                            </tr>
                            ${Object.entries(incomeByCategory).length > 0 ? Object.entries(incomeByCategory).map(([cat, amt]) => `
                                <tr>
                                    <td>${cat}</td>
                                    <td class="amount">${amt.toLocaleString()} 원</td>
                                </tr>
                            `).join('') : '<tr><td colspan="2" style="text-align:center">데이터 없음</td></tr>'}
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-name">4. 세부 지출 내역</div>
                        <table>
                            <tr>
                                <th>항목</th>
                                <th style="text-align: right">금액</th>
                            </tr>
                            ${Object.entries(expenseByCategory).length > 0 ? Object.entries(expenseByCategory).map(([cat, amt]) => `
                                <tr>
                                    <td>${cat}</td>
                                    <td class="amount">${amt.toLocaleString()} 원</td>
                                </tr>
                            `).join('') : '<tr><td colspan="2" style="text-align:center">데이터 없음</td></tr>'}
                        </table>
                    </div>
                </div>

                <div class="footer">
                    <p>위와 같이 보고합니다.</p>
                    <p>재정 담당: ________________ (인)</p>
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
