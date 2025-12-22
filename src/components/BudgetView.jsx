import React from 'react';
import { Target, AlertCircle, ArrowUpDown } from 'lucide-react';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/ledgerConstants';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function BudgetView({ budgets, setBudgets, transactions }) {
    const handleBudgetChange = (category, value) => {
        setBudgets({
            ...budgets,
            [category]: Number(value)
        });
    };

    const getActualAmount = (category) => {
        return transactions
            .filter(tx => tx.category === category)
            .reduce((sum, tx) => sum + tx.amount, 0);
    };

    const getFinanceTypeSubtotal = (type, categories, txType) => {
        const budgetTotal = categories.reduce((sum, cat) => {
            // Check if user set a budget for this category
            // Note: Budgets are flattened, so we just look up by category name
            return sum + (budgets[cat] || 0);
        }, 0);

        const actualTotal = categories.reduce((sum, cat) => {
            return sum + transactions
                .filter(tx => tx.category === cat && tx.type === txType)
                .reduce((s, tx) => s + tx.amount, 0);
        }, 0);

        return { budgetTotal, actualTotal };
    };

    // Sorting State
    const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedCategories = (categories) => {
        if (!sortConfig.key) return categories;

        return [...categories].sort((a, b) => {
            let aValue, bValue;

            if (sortConfig.key === 'category') {
                aValue = a;
                bValue = b;
            } else if (sortConfig.key === 'budget') {
                aValue = budgets[a] || 0;
                bValue = budgets[b] || 0;
            } else if (sortConfig.key === 'actual') {
                aValue = getActualAmount(a);
                bValue = getActualAmount(b);
            } else if (sortConfig.key === 'ratio') {
                const aBudget = budgets[a] || 0;
                const bBudget = budgets[b] || 0;
                aValue = aBudget > 0 ? (getActualAmount(a) / aBudget) : 0;
                bValue = bBudget > 0 ? (getActualAmount(b) / bBudget) : 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    // Prepare Chart Data
    const chartData = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

        const initMonthlyData = () => Array(12).fill(0);

        const data = {
            general: { income: initMonthlyData(), expense: initMonthlyData(), balance: initMonthlyData() },
            special: { income: initMonthlyData(), expense: initMonthlyData(), balance: initMonthlyData() },
            total: { income: initMonthlyData(), expense: initMonthlyData(), balance: initMonthlyData() }
        };

        const totals = {
            general: { income: 0, expense: 0, balance: 0 },
            special: { income: 0, expense: 0, balance: 0 },
            total: { income: 0, expense: 0, balance: 0 }
        };

        transactions.forEach(tx => {
            const date = new Date(tx.date);
            if (date.getFullYear() === currentYear) {
                const month = date.getMonth(); // 0-11
                const type = tx.type; // 'income' or 'expense'
                const financeType = tx.financeType === '특별재정' ? 'special' : 'general';

                // Individual Finance Type
                if (data[financeType] && data[financeType][type]) {
                    data[financeType][type][month] += tx.amount;
                    totals[financeType][type] += tx.amount;
                }

                // Total Finance
                data.total[type][month] += tx.amount;
                totals.total[type] += tx.amount;
            }
        });

        // Calculate Balances
        for (let i = 0; i < 12; i++) {
            data.general.balance[i] = data.general.income[i] - data.general.expense[i];
            data.special.balance[i] = data.special.income[i] - data.special.expense[i];
            data.total.balance[i] = data.total.income[i] - data.total.expense[i];
        }

        // Calculate Total Balances
        totals.general.balance = totals.general.income - totals.general.expense;
        totals.special.balance = totals.special.income - totals.special.expense;
        totals.total.balance = totals.total.income - totals.total.expense;

        return { months, data, totals };
    }, [transactions]);

    const createChartOptions = (title) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: title,
            },
            tooltip: { // Add tooltip formatting for currency
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        // Shorten large numbers: 1M, 100k etc. or simple locale string
                        return value.toLocaleString();
                    }
                }
            }
        }
    });

    const getCommonDatasets = (financeTypeData) => [
        {
            label: '수입',
            data: financeTypeData.income,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.4,
            order: 2
        },
        {
            label: '지출',
            data: financeTypeData.expense,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4,
            order: 3
        },
        {
            label: '잔액',
            data: financeTypeData.balance,
            borderColor: 'rgb(54, 162, 235)',
            borderDash: [5, 5],
            backgroundColor: 'rgba(54, 162, 235, 0)',
            pointStyle: 'rectRot',
            pointRadius: 5,
            fill: false,
            tension: 0.4,
            order: 1
        }
    ];

    const generalChartData = {
        labels: chartData.months,
        datasets: getCommonDatasets(chartData.data.general)
    };

    const specialChartData = {
        labels: chartData.months,
        datasets: getCommonDatasets(chartData.data.special)
    };

    const totalChartData = {
        labels: chartData.months,
        datasets: getCommonDatasets(chartData.data.total)
    };

    return (
        <div className="budget-container">
            <div className="budget-header" style={{ marginBottom: '2rem' }}>
                <h2>예산 설정 및 통계 분석 ({new Date().getFullYear()}년)</h2>
                <p className="text-muted">재정 흐름을 그래프로 확인하고 항목별 예산을 설정합니다.</p>
            </div>

            {/* Total Summary Cards */}
            <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card shadow-sm p-4" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <h4 style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>전체 수입 (Total Income)</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5', margin: 0 }}>
                        {chartData.totals.total.income.toLocaleString()}원
                    </p>
                </div>
                <div className="card shadow-sm p-4" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <h4 style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>전체 지출 (Total Expense)</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', margin: 0 }}>
                        {chartData.totals.total.expense.toLocaleString()}원
                    </p>
                </div>
                <div className="card shadow-sm p-4" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <h4 style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>전체 잔액 (Total Balance)</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: chartData.totals.total.balance >= 0 ? '#10b981' : '#f59e0b', margin: 0 }}>
                        {chartData.totals.total.balance.toLocaleString()}원
                    </p>
                </div>
            </div>

            <div className="charts-section" style={{ marginBottom: '3rem' }}>
                {/* Total Finance Chart */}
                <div className="chart-card card shadow-sm p-4" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ height: '300px' }}>
                        <Line options={createChartOptions('전체 재정 (통합) 월별 흐름')} data={totalChartData} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="chart-card card shadow-sm p-4" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                        <div style={{ height: '250px' }}>
                            <Line options={createChartOptions('일반재정 월별 흐름')} data={generalChartData} />
                        </div>
                    </div>
                    <div className="chart-card card shadow-sm p-4" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                        <div style={{ height: '250px' }}>
                            <Line options={createChartOptions('특별재정 월별 흐름')} data={specialChartData} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="budget-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="budget-section card shadow-sm p-4" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#4f46e5' }}>
                        <Target size={20} /> 수입 예산
                    </h3>
                    {Object.entries(INCOME_CATEGORIES).map(([type, cats]) => (
                        <div key={type} style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem', borderBottom: '1px solid #eee' }}>{type}</h4>
                            <table className="ledger-table" style={{ marginBottom: '1rem' }}>
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                                            항목 <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                        </th>
                                        <th width="120" className="text-right" onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>
                                            예산 <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                        </th>
                                        <th width="120" className="text-right" onClick={() => handleSort('actual')} style={{ cursor: 'pointer' }}>
                                            실제 <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                        </th>
                                        <th width="80" className="text-right" onClick={() => handleSort('ratio')} style={{ cursor: 'pointer' }}>
                                            달성률 <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getSortedCategories(cats).map(cat => {
                                        const actual = getActualAmount(cat);
                                        const budget = budgets[cat] || 0;
                                        const ratio = budget > 0 ? (actual / budget) * 100 : 0;
                                        return (
                                            <tr key={cat}>
                                                <td style={{ fontSize: '0.85rem' }}>{cat}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="budget-input text-right"
                                                        style={{ width: '100%', border: 'none', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}
                                                        value={budgets[cat] || ''}
                                                        placeholder="0"
                                                        onChange={(e) => handleBudgetChange(cat, e.target.value)}
                                                    />
                                                </td>
                                                <td className="text-right font-bold text-primary" style={{ fontSize: '0.85rem' }}>
                                                    {actual.toLocaleString()}
                                                </td>
                                                <td className="text-right" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                    {budget > 0 ? `${ratio.toFixed(1)}%` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 'bold', background: '#f8fafc' }}>
                                        <td style={{ fontSize: '0.85rem', padding: '8px' }}>{type} 소계</td>
                                        <td className="text-right" style={{ fontSize: '0.85rem', padding: '8px' }}>
                                            {getFinanceTypeSubtotal(type, cats, 'income').budgetTotal.toLocaleString()}
                                        </td>
                                        <td className="text-right text-primary" style={{ fontSize: '0.85rem', padding: '8px' }}>
                                            {getFinanceTypeSubtotal(type, cats, 'income').actualTotal.toLocaleString()}
                                        </td>
                                        <td className="text-right" style={{ fontSize: '0.85rem', padding: '8px' }}>
                                            {getFinanceTypeSubtotal(type, cats, 'income').budgetTotal > 0
                                                ? `${((getFinanceTypeSubtotal(type, cats, 'income').actualTotal / getFinanceTypeSubtotal(type, cats, 'income').budgetTotal) * 100).toFixed(1)}%`
                                                : '-'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div className="budget-section card shadow-sm p-4" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#ef4444' }}>
                        <Target size={20} /> 지출 예산
                    </h3>
                    {Object.entries(EXPENSE_CATEGORIES).map(([type, cats]) => (
                        <div key={type} style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem', borderBottom: '1px solid #eee' }}>{type}</h4>
                            <table className="ledger-table" style={{ marginBottom: '1rem' }}>
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                                            항목 <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                        </th>
                                        <th width="120" className="text-right" onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>
                                            예산 <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                        </th>
                                        <th width="120" className="text-right" onClick={() => handleSort('actual')} style={{ cursor: 'pointer' }}>
                                            실제 <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                        </th>
                                        <th width="80" className="text-right" onClick={() => handleSort('ratio')} style={{ cursor: 'pointer' }}>
                                            달성률 <ArrowUpDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getSortedCategories(cats).map(cat => {
                                        const actual = getActualAmount(cat);
                                        const budget = budgets[cat] || 0;
                                        const overBudget = budget > 0 && actual > budget;
                                        const ratio = budget > 0 ? (actual / budget) * 100 : 0;

                                        return (
                                            <tr key={cat}>
                                                <td style={{ fontSize: '0.85rem' }}>{cat}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="budget-input text-right"
                                                        style={{ width: '100%', border: 'none', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}
                                                        value={budgets[cat] || ''}
                                                        placeholder="0"
                                                        onChange={(e) => handleBudgetChange(cat, e.target.value)}
                                                    />
                                                </td>
                                                <td className={`text-right font-bold ${overBudget ? 'expense-text' : ''}`} style={{ fontSize: '0.85rem' }}>
                                                    {actual.toLocaleString()}
                                                    {overBudget && <AlertCircle size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />}
                                                </td>
                                                <td className="text-right" style={{ fontSize: '0.85rem', color: overBudget ? '#ef4444' : '#64748b' }}>
                                                    {budget > 0 ? `${ratio.toFixed(1)}%` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 'bold', background: '#f8fafc' }}>
                                        <td style={{ fontSize: '0.85rem', padding: '8px' }}>{type} 소계</td>
                                        <td className="text-right" style={{ fontSize: '0.85rem', padding: '8px' }}>
                                            {getFinanceTypeSubtotal(type, cats, 'expense').budgetTotal.toLocaleString()}
                                        </td>
                                        <td className="text-right expense-text" style={{ fontSize: '0.85rem', padding: '8px' }}>
                                            {getFinanceTypeSubtotal(type, cats, 'expense').actualTotal.toLocaleString()}
                                        </td>
                                        <td className="text-right" style={{ fontSize: '0.85rem', padding: '8px' }}>
                                            {getFinanceTypeSubtotal(type, cats, 'expense').budgetTotal > 0
                                                ? `${((getFinanceTypeSubtotal(type, cats, 'expense').actualTotal / getFinanceTypeSubtotal(type, cats, 'expense').budgetTotal) * 100).toFixed(1)}%`
                                                : '-'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BudgetView;
