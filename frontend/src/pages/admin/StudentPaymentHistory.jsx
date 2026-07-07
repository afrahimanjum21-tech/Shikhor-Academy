import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Banknote, CheckCircle, XCircle, Clock, AlertTriangle, CreditCard, TrendingUp, TrendingDown, Calendar } from "lucide-react";

export default function StudentPaymentHistory() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/admin/student/${id}/payment-history`);
                setData(res.data);
            } catch (err) {
                console.error(err);
                alert("Failed to load payment history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading payment history...</div>;
    if (!data) return <div className="p-10 text-center text-gray-500">No data found.</div>;

    const { student, course_fee, paid_months, due_months, total_paid, total_due, monthly_breakdown, payments } = data;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid': return { icon: <CheckCircle size={14} />, label: 'Paid', color: 'bg-green-100 text-green-700 border-green-200' };
            case 'due': return { icon: <XCircle size={14} />, label: 'Due', color: 'bg-red-100 text-red-700 border-red-200' };
            case 'pending': return { icon: <Clock size={14} />, label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
            default: return { icon: <AlertTriangle size={14} />, label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
        }
    };

    const getMethodBadge = (method) => {
        if (!method) return null;
        const styles = {
            'SSLCommerz': 'bg-purple-100 text-purple-700 border-purple-200',
            'Cash': 'bg-green-100 text-green-700 border-green-200',
            'Bkash': 'bg-pink-100 text-pink-700 border-pink-200',
            'Nagad': 'bg-orange-100 text-orange-700 border-orange-200',
            'Bank': 'bg-blue-100 text-blue-700 border-blue-200',
        };
        return styles[method] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const filteredPayments = filterStatus === 'all'
        ? monthly_breakdown
        : monthly_breakdown.filter(m => m.status === filterStatus);

    const filterCounts = [
        { key: 'all', label: 'All', count: monthly_breakdown.length },
        { key: 'paid', label: 'Paid', count: paid_months.length },
        { key: 'due', label: 'Due', count: due_months.length },
        { key: 'pending', label: 'Pending', count: payments.filter(p => p.status === 'pending').length },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10 px-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
                <button onClick={() => navigate(`/admin/students/${id}/profile`)} className="flex items-center gap-2 text-gray-600 hover:text-[#1F4E79] font-bold">
                    <ArrowLeft size={20}/> Back to Profile
                </button>
                <h1 className="text-lg font-bold text-[#1F4E79]">Payment History</h1>
            </div>

            {/* Student Header */}
            <div className="bg-white p-5 rounded-xl shadow border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1F4E79] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student?.user?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{student?.user?.name}</h2>
                        <p className="text-sm text-gray-500">ID: {student?.student_id_card_no || 'N/A'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Monthly Fee</p>
                    <p className="text-lg font-bold text-[#1F4E79]">&#2547;{course_fee}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <Banknote className="mx-auto text-[#1F4E79] mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">&#2547;{course_fee}</p>
                    <p className="text-xs text-gray-500 font-medium">Monthly Fee</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <TrendingUp className="mx-auto text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-green-600">&#2547;{total_paid}</p>
                    <p className="text-xs text-gray-500 font-medium">Total Paid</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <TrendingDown className="mx-auto text-red-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-red-600">&#2547;{total_due}</p>
                    <p className="text-xs text-gray-500 font-medium">Total Due</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <Calendar className="mx-auto text-blue-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{due_months.length}</p>
                    <p className="text-xs text-gray-500 font-medium">Due Months</p>
                </div>
            </div>

            {/* Due Months Alert */}
            {due_months.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                            <h4 className="font-bold text-red-700">Unpaid Months ({due_months.length})</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {due_months.map(month => (
                                    <span key={month} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
                                        {month}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
                {filterCounts.map(f => (
                    <button key={f.key} onClick={() => setFilterStatus(f.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border transition ${filterStatus === f.key ? 'bg-[#1F4E79] text-white border-[#1F4E79]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        {f.label} ({f.count})
                    </button>
                ))}
            </div>

            {/* Monthly Breakdown */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-[#1F4E79] flex items-center gap-2">
                        <CreditCard size={20}/> Monthly Payment Breakdown
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="p-4 text-left">#</th>
                                <th className="p-4 text-left">Month</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-left hidden md:table-cell">Method</th>
                                <th className="p-4 text-left hidden lg:table-cell">Transaction ID</th>
                                <th className="p-4 text-left hidden sm:table-cell">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredPayments.map((entry, idx) => {
                                const badge = getStatusBadge(entry.status);
                                return (
                                    <tr key={entry.month} className={`transition ${entry.status === 'due' ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4 text-gray-400 font-mono">{idx + 1}</td>
                                        <td className="p-4 font-medium text-gray-900">{entry.month}</td>
                                        <td className="p-4 text-right font-bold text-gray-900">&#2547;{entry.amount}</td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                {badge.icon} {badge.label}
                                            </span>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            {entry.method ? (
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getMethodBadge(entry.method)}`}>
                                                    {entry.method}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-500 font-mono text-xs hidden lg:table-cell">
                                            {entry.trx_id || '—'}
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm hidden sm:table-cell">
                                            {entry.date || '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* All Transactions */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-[#1F4E79] flex items-center gap-2">
                        <Banknote size={20}/> All Transactions
                    </h3>
                </div>
                {payments.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <Banknote size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-lg font-medium">No transactions recorded</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="p-4 text-left">Transaction ID</th>
                                    <th className="p-4 text-left">Month</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-left hidden md:table-cell">Method</th>
                                    <th className="p-4 text-left hidden sm:table-cell">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payments.map(p => {
                                    const badge = getStatusBadge(p.status);
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-mono text-xs text-gray-500">{p.trx_id}</td>
                                            <td className="p-4 font-medium text-gray-900">{p.month}</td>
                                            <td className="p-4 text-right font-bold text-gray-900">&#2547;{p.amount}</td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                    {badge.icon} {badge.label}
                                                </span>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                {p.method ? (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getMethodBadge(p.method)}`}>
                                                        {p.method}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm hidden sm:table-cell">{p.date}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
