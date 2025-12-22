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

function DashboardView({ transactions }) {
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyIncome = transactions
            .filter(tx => {
                const d = new Date(tx.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'income';
            })
            .reduce((sum, tx) => sum + tx.amount, 0);

        const monthlyExpense = transactions
            .filter(tx => {
                const d = new Date(tx.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense';
            })
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

        const monthlyCarryover = transactions
            .filter(tx => {
                const d = new Date(tx.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'income' && ['일반이월금', '특별이월금'].includes(tx.category);
            })
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalCarryover = transactions
            .filter(tx => tx.type === 'income' && ['일반이월금', '특별이월금'].includes(tx.category))
            .reduce((sum, tx) => sum + tx.amount, 0);

        return {
            monthlyIncome,
            monthlyExpense,
            totalIncome,
            totalExpense,
            specialIncome,
            generalIncome,
            monthlyCarryover,
            totalCarryover,
            monthlyPureIncome: monthlyIncome - monthlyCarryover,
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

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>라온동행교회 재정보고서 - ${dateStr}</title>
                <style>
                    body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
                    h1 { text-align: center; color: #333; margin-bottom: 10px; }
                    .date { text-align: center; color: #666; margin-bottom: 40px; }
                    .section { margin-bottom: 30px; }
                    .section-title { font-size: 1.2rem; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f8f9fa; text-align: center; }
                    .amount { text-align: right; font-weight: bold; }
                    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .total-row { background-color: #f0fdf4; font-weight: bold; }
                    .footer { margin-top: 50px; text-align: center; font-size: 0.9rem; color: #888; }
                </style>
            </head>
            <body>
                <h1>라온동행교회 재정보고서</h1>
                <p class="date">기준일: ${dateStr}</p>

                <div class="section">
                    <div class="section-title">1. 전체 재정 현황</div>
                    <table>
                        <tr>
                            <th>구분</th>
                            <th>금액</th>
                        </tr>
                        <tr>
                            <td>금년 순수입 (이월금 제외)</td>
                            <td class="amount">${pureIncomeV.toLocaleString()} 원</td>
                        </tr>
                        <tr>
                            <td>전년 이월금</td>
                            <td class="amount">${carryoverV.toLocaleString()} 원</td>
                        </tr>
                        <tr style="background-color: #f8fafc">
                            <td><strong>총 수입 계</strong> (이월금 포함)</td>
                            <td class="amount" style="color: #4f46e5">${totalIncomeV.toLocaleString()} 원</td>
                        </tr>
                        <tr>
                            <td>총 지출</td>
                            <td class="amount" style="color: #ef4444">${totalExpenseV.toLocaleString()} 원</td>
                        </tr>
                        <tr class="total-row">
                            <td>현재 잔액</td>
                            <td class="amount" style="color: ${balanceV >= 0 ? '#10b981' : '#ef4444'}">${balanceV.toLocaleString()} 원</td>
                        </tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">2. 자산 현황</div>
                    <table>
                        <tr>
                            <th>자산명</th>
                            <th>금액</th>
                        </tr>
                        <tr>
                            <td>부동산 임대보증금</td>
                            <td class="amount">${assetsV.toLocaleString()} 원</td>
                        </tr>
                        <tr class="total-row">
                            <td>총 자산 (잔액 포함)</td>
                            <td class="amount">${(balanceV + assetsV).toLocaleString()} 원</td>
                        </tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">3. 세부 수입 내역 (항목별)</div>
                    <table>
                        <tr>
                            <th>항목</th>
                            <th style="text-align: right">금액</th>
                        </tr>
                        ${Object.entries(incomeByCategory).map(([cat, amt]) => `
                            <tr>
                                <td>${cat}</td>
                                <td class="amount">${amt.toLocaleString()} 원</td>
                            </tr>
                        `).join('')}
                    </table>
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
                        <span className="stat-label">이번 달 수입</span>
                        <div className="stat-icon income"><TrendingUp size={16} /></div>
                    </div>
                    <div className="stat-value">₩ {stats.monthlyIncome.toLocaleString()}</div>
                    <div className="stat-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <div style={{ color: '#4b5563', fontSize: '0.8rem' }}>
                            (이월 제외: ₩ {stats.monthlyPureIncome.toLocaleString()})
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', marginTop: '2px' }}>
                            <span style={{ color: '#6366f1' }}>일반: {stats.generalIncome.toLocaleString()}</span>
                            <span style={{ color: '#8b5cf6' }}>특별: {stats.specialIncome.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">이번 달 지출</span>
                        <div className="stat-icon expense"><TrendingDown size={16} /></div>
                    </div>
                    <div className="stat-value">₩ {stats.monthlyExpense.toLocaleString()}</div>
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
