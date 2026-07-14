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

import { FINANCE_TYPES } from '../constants/ledgerConstants';

function DashboardView({ transactions, viewMode }) {
    const isYearly = viewMode === 'YEARLY';
    const periodLabel = isYearly ? '올해' : '이번 달';

    const stats = useMemo(() => {
        // OVERALL TOTALS (Excluding Designated)
        const periodIncome = transactions
            .filter(tx => tx.type === 'income' && tx.financeType !== FINANCE_TYPES.DESIGNATED)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const periodExpense = transactions
            .filter(tx => tx.type === 'expense' && tx.financeType !== FINANCE_TYPES.DESIGNATED)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalIncome = transactions
            .filter(tx => tx.type === 'income' && tx.financeType !== FINANCE_TYPES.DESIGNATED)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalExpense = transactions
            .filter(tx => tx.type === 'expense' && tx.financeType !== FINANCE_TYPES.DESIGNATED)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const specialIncome = transactions
            .filter(tx => tx.type === 'income' && tx.financeType === FINANCE_TYPES.SPECIAL)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const generalIncome = transactions
            .filter(tx => tx.type === 'income' && tx.financeType === FINANCE_TYPES.GENERAL)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const designatedIncome = transactions
            .filter(tx => tx.type === 'income' && tx.financeType === FINANCE_TYPES.DESIGNATED)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const specialExpense = transactions
            .filter(tx => tx.type === 'expense' && tx.financeType === FINANCE_TYPES.SPECIAL)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const generalExpense = transactions
            .filter(tx => tx.type === 'expense' && tx.financeType === FINANCE_TYPES.GENERAL)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const designatedExpense = transactions
            .filter(tx => tx.type === 'expense' && tx.financeType === FINANCE_TYPES.DESIGNATED)
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
            designatedIncome,
            specialExpense,
            generalExpense,
            designatedExpense,
            periodCarryover,
            totalCarryover,
            periodPureIncome: periodIncome - periodCarryover,
            totalPureIncome: totalIncome - totalCarryover,
            generalBalance: generalIncome - generalExpense,
            specialBalance: specialIncome - specialExpense
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
        const designatedBalanceV = stats.designatedIncome - stats.designatedExpense;
        const churchLoan = 216000000;
        const districtLoan = 10000000;
        const totalLiabilities = churchLoan + districtLoan;

        // Custom Calculations for Special Finance
        const raonTreeExpense = transactions
            .filter(tx => tx.financeType === FINANCE_TYPES.SPECIAL && tx.type === 'expense' && tx.category === '라온트리지원(월세/관리)')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const missionServiceExpense = stats.specialExpense - raonTreeExpense;
        const seedOfferingBalance = stats.specialBalance; // User calls Special Balance 'Seed Offering Balance'

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
                    .section { margin-bottom: 30px; page-break-inside: avoid; }
                    .section-title { font-size: 1.1rem; font-weight: bold; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 10px; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 5px; table-layout: fixed; }
                    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; font-size: 0.9rem; }
                    th { background: #f8fafc; text-align: left; font-weight: 600; color: #475569; }
                    .amount { text-align: right; }
                    .total-row { background: #f1f5f9; font-weight: bold; }
                    .sub-label { color: #64748b; font-size: 0.85rem; }
                    .positive { color: #059669; }
                    .negative { color: #ef4444; }
                    .footer { margin-top: 50px; text-align: center; color: #64748b; }
                    .sign { margin-top: 30px; display: flex; justify-content: center; gap: 50px; }
                </style>
            </head>
            <body>
                <div class="report-wrapper">
                    <h1>라온동행교회 재정보고서</h1>
                    <div class="period">${periodStr}</div>
                    
                    <div class="section">
                        <div class="section-title">1. 특별재정 (씨앗헌금)</div>
                        <table>
                             <tr><th style="width: 60%">항목</th><th style="width: 40%">금액</th></tr>
                             <tr>
                                <td>선교와 섬김 <span class="sub-label">(라온트리 지원 제외)</span></td>
                                <td class="amount">${missionServiceExpense.toLocaleString()} 원</td>
                             </tr>
                             <tr>
                                <td>라온트리 지원</td>
                                <td class="amount">${raonTreeExpense.toLocaleString()} 원</td>
                             </tr>
                             <tr class="total-row" style="background: #eff6ff">
                                <td><strong>씨앗헌금 잔액</strong></td>
                                <td class="amount ${seedOfferingBalance >= 0 ? 'positive' : 'negative'}"><strong>${seedOfferingBalance.toLocaleString()} 원</strong></td>
                             </tr>
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-title">2. 지정헌금</div>
                        <table>
                             <tr><th style="width: 60%">항목</th><th style="width: 40%">금액</th></tr>
                             <tr class="total-row">
                                <td><strong>지정헌금 잔액</strong></td>
                                <td class="amount ${designatedBalanceV >= 0 ? 'positive' : 'negative'}"><strong>${designatedBalanceV.toLocaleString()} 원</strong></td>
                             </tr>
                        </table>
                    </div>
                    <div class="section">
                        <div class="section-title">3. 교회 부채 (대출금)</div>
                        <table>
                             <tr><th style="width: 60%">항목</th><th style="width: 40%">금액</th></tr>
                             <tr>
                                <td>교회 대출금</td>
                                <td class="amount">${churchLoan.toLocaleString()} 원</td>
                             </tr>
                             <tr>
                                <td>지방회 대출금</td>
                                <td class="amount">${districtLoan.toLocaleString()} 원</td>
                             </tr>
                             <tr class="total-row" style="background: #fef2f2">
                                <td><strong>부채 합계</strong></td>
                                <td class="amount" style="color: #ef4444"><strong>${totalLiabilities.toLocaleString()} 원</strong></td>
                             </tr>
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-title">4. 일반재정</div>
                        <table>
                             <tr><th style="width: 60%">항목</th><th style="width: 40%">금액</th></tr>
                             <tr>
                                <td>일반재정 수입</td>
                                <td class="amount">${stats.generalIncome.toLocaleString()} 원</td>
                             </tr>
                             <tr>
                                <td>일반재정 지출</td>
                                <td class="amount">${stats.generalExpense.toLocaleString()} 원</td>
                             </tr>
                             <tr class="total-row" style="background: #fff7ed">
                                <td><strong>일반재정 잔액</strong></td>
                                <td class="amount ${stats.generalBalance >= 0 ? 'positive' : 'negative'}"><strong>${stats.generalBalance.toLocaleString()} 원</strong></td>
                             </tr>
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-title">5. 전체 합계</div>
                        <table>
                             <tr class="total-row" style="background: #f0fdf4; font-size: 1.1rem;">
                                <td style="width: 60%"><strong>전체 잔액 (일반+특별)</strong></td>
                                <td style="width: 40%" class="amount ${balanceV >= 0 ? 'positive' : 'negative'}"><strong>${balanceV.toLocaleString()} 원</strong></td>
                             </tr>
                        </table>
                        <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 8px; text-align: right;">* 전체 잔액은 지정헌금을 제외한 운영 자금 합계입니다.</p>
                    </div>

                    <div class="section" style="margin-top: 40px; border-top: 2px dashed #cbd5e1; padding-top: 30px;">
                        <div class="section-title">부록: 상세 내역</div>
                        <h3 style="font-size: 1rem; margin-bottom: 10px;">항목별 수입</h3>
                        <table>
                            <tr><th>항목</th><th>금액</th></tr>
                            ${incomeTableRows || '<tr><td colspan="2" style="text-align:center">내역 없음</td></tr>'}
                        </table>
                        
                        <h3 style="font-size: 1rem; margin-top: 20px; margin-bottom: 10px;">항목별 지출</h3>
                        <table>
                            <tr><th>항목</th><th>금액</th></tr>
                            ${expenseTableRows || '<tr><td colspan="2" style="text-align:center">내역 없음</td></tr>'}
                        </table>

                        <h3 style="font-size: 1rem; margin-top: 20px; margin-bottom: 10px;">지출부 상세</h3>
                        <table style="font-size: 0.8rem">
                            <thead>
                                <tr><th style="width: 15%">일자</th><th style="width: 20%">항목</th><th style="width: 15%">성명</th><th style="width: 20%">금액</th><th>비고</th></tr>
                            </thead>
                            <tbody>
                                ${ledgerRows || '<tr><td colspan="5" style="text-align:center">내역 없음</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="footer">
                        <p>${dateStr}</p>
                        <div class="sign">
                            <span>재정 위원: ____________ (인)</span>
                            <span>담임 목사: ____________ (인)</span>
                        </div>
                    </div>
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
                            <span style={{ color: '#ec4899' }}>지정: {stats.designatedIncome.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">{periodLabel} 지출</span>
                        <div className="stat-icon expense"><TrendingDown size={16} /></div>
                    </div>
                    <div className="stat-value">₩ {stats.periodExpense.toLocaleString()}</div>
                    <div className="stat-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                            <span style={{ color: '#6366f1' }}>일반: {stats.generalExpense.toLocaleString()}</span>
                            <span style={{ color: '#8b5cf6' }}>특별: {stats.specialExpense.toLocaleString()}</span>
                            <span style={{ color: '#ec4899' }}>지정: {stats.designatedExpense.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">현재 잔액 (일반+특별)</span>
                        <div className="stat-icon balance"><Wallet size={16} /></div>
                    </div>
                    <div className="stat-value primary">₩ {(stats.totalIncome - stats.totalExpense).toLocaleString()}</div>
                    <div className="stat-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                            <span style={{ color: '#6366f1' }}>일반: {stats.generalBalance.toLocaleString()}</span>
                            <span style={{ color: '#8b5cf6' }}>특별: {stats.specialBalance.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="stat-header">
                        <span className="stat-label">교회 부채 (대출금)</span>
                        <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Building size={16} /></div>
                    </div>
                    <div className="stat-value" style={{ color: '#ef4444' }}>₩ 226,000,000</div>
                    <div className="stat-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                            <span style={{ color: '#ef4444' }}>교회: 216,000,000</span>
                            <span style={{ color: '#f97316' }}>지방회: 10,000,000</span>
                        </div>
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
