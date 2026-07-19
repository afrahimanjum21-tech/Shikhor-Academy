import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import { Banknote, CheckCircle, XCircle, Clock, AlertTriangle, CreditCard, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';
 
export default function StudentPaymentHistory() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/admin/student/${id}/payment-history`);
                setData(res.data);
            } catch (err) {
                logger.error(err);
                notify.error("Failed to load payment history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-400">Loading payment history...</div>;
    if (!data) return <div className="p-10 text-center text-gray-400">No data found.</div>;

    const { student, course_fee, paid_months, due_months, total_paid, total_due, monthly_breakdown, payments } = data;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid': return { icon: CheckCircle, label: 'Paid', color: 'bg-green-100 text-green-700 border-green-200' };
            case 'due': return { icon: XCircle, label: 'Due', color: 'bg-red-100 text-red-700 border-red-200' };
            case 'pending': return { icon: Clock, label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
            default: return { icon: AlertTriangle, label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
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
        { key: 'all', label: 'All', count: monthly_breakdown.length, icon: Banknote },
        { key: 'paid', label: 'Paid', count: paid_months.length, icon: CheckCircle },
        { key: 'due', label: 'Due', count: due_months.length, icon: XCircle },
        { key: 'pending', label: 'Pending', count: payments.filter(p => p.status === 'pending').length, icon: Clock },
    ];

    return (
        <div className="space-y-6">
            {/* Page title */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 md:px-7 py-4">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Payment History</h2>
                    <p className="text-xs md:text-sm text-gray-400 mt-0.5">
                        {student?.user?.name} — ID: {student?.student_id_card_no || 'N/A'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Monthly Fee</p>
                    <p className="text-lg font-bold text-[#1F4E79]">৳{course_fee}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <SummaryCard icon={Banknote} label="Monthly Fee" value={`৳${course_fee}`} color="text-[#1F4E79]" />
                <SummaryCard icon={TrendingUp} label="Total Paid" value={`৳${total_paid}`} color="text-green-500" />
                <SummaryCard icon={TrendingDown} label="Total Due" value={`৳${total_due}`} color="text-red-500" />
                <SummaryCard icon={Calendar} label="Due Months" value={due_months.length} color="text-orange-500" />
            </div>

            {/* Due Months Alert */}
            {due_months.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:shadow-lg hover:border-red-300">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">Unpaid Months ({due_months.length})</h4>
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
                    <button
                        key={f.key}
                        onClick={() => setFilterStatus(f.key)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all duration-200 ${
                            filterStatus === f.key
                                ? 'bg-[#1F4E79] text-white border-[#1F4E79] shadow-sm'
                                : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                        }`}
                    >
                        <f.icon size={14} /> {f.label} ({f.count})
                    </button>
                ))}
            </div>

            {/* Monthly Payment Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center gap-2.5">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><CreditCard size={16} className="text-[#1F4E79]" /></div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900">Monthly Payment Breakdown</h3>
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
                                        <td className="p-4 text-right font-bold text-gray-900">৳{entry.amount}</td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                <badge.icon size={12} /> {badge.label}
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
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center gap-2.5">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><Banknote size={16} className="text-[#1F4E79]" /></div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900">All Transactions</h3>
                </div>
                {payments.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <Banknote size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-base font-medium">No transactions recorded</p>
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
                                            <td className="p-4 text-right font-bold text-gray-900">৳{p.amount}</td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                    <badge.icon size={12} /> {badge.label}
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

function SummaryCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 text-center transition-all duration-300 hover:shadow-lg hover:border-gray-200">
            <Icon size={22} className={`mx-auto mb-2 ${color || 'text-gray-400'}`} />
            <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
        </div>
    );
}
