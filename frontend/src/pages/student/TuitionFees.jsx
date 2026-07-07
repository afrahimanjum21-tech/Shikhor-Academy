import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
    AlertCircle,
    AlertTriangle,
    Banknote,
    CheckCircle,
    CreditCard,
    History,
    Loader2,
} from "lucide-react";

const money = (value) => `BDT ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

const statusClass = {
    paid: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-blue-100 text-blue-700 border-blue-200",
    due: "bg-red-100 text-red-700 border-red-200",
};

export default function TuitionFees() {
    const [data, setData] = useState({
        course_fee: 0,
        total_paid: 0,
        total_due: 0,
        due_months: [],
        pending_payments: [],
        history: [],
    });
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: response } = await api.get("/student/payments");
            setData(response);
            setSelectedMonth(response.due_months?.[0] || "");
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load payment information");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const pendingMonths = useMemo(
        () => new Set((data.pending_payments || []).map((item) => item.month)),
        [data.pending_payments]
    );

    const startPayment = async (month = selectedMonth) => {
        if (!month) return;

        setPaying(true);
        setError("");

        try {
            const { data: response } = await api.post("/student/payment/initiate", { month });
            if (!response.gateway_url) {
                throw new Error("Gateway URL was not returned");
            }
            window.location.assign(response.gateway_url);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Unable to start online payment");
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-[#1F4E79] flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Calculating fees...
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                        <Banknote size={28} /> Tuition & Fees
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monthly Fee: <span className="font-bold text-gray-800">{money(data.course_fee)}</span>
                    </p>
                </div>

                <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
                    <select
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                        disabled={!data.due_months.length || paying}
                        className="min-w-56 rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79] disabled:bg-gray-100"
                    >
                        {data.due_months.length === 0 && <option value="">No dues</option>}
                        {data.due_months.map((month) => (
                            <option key={month} value={month}>
                                {month}{pendingMonths.has(month) ? " - pending" : ""}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => startPayment()}
                        disabled={!selectedMonth || paying}
                        className="bg-[#1F4E79] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#163859] shadow-md flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {paying ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                        Pay Online
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Paid</p>
                        <h3 className="text-3xl font-bold text-green-600 mt-1">{money(data.total_paid)}</h3>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full text-green-600">
                        <CheckCircle size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border-l-4 border-red-500 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Due</p>
                        <h3 className="text-3xl font-bold text-red-600 mt-1">{money(data.total_due)}</h3>
                    </div>
                    <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <AlertCircle size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Payment Status</p>
                        <h3 className={`text-xl font-bold mt-1 ${data.total_due > 0 ? "text-orange-500" : "text-green-600"}`}>
                            {data.total_due > 0 ? "Payment Pending" : "All Clear"}
                        </h3>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <History size={24} />
                    </div>
                </div>
            </div>

            {data.due_months.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-red-700 font-bold flex items-center gap-2 mb-3">
                        <AlertTriangle size={20} /> Outstanding Months
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {data.due_months.map((month) => (
                            <button
                                key={month}
                                onClick={() => startPayment(month)}
                                disabled={paying}
                                className="bg-white text-left text-red-700 px-3 py-2 rounded border border-red-100 text-sm font-medium shadow-sm hover:border-red-300 disabled:opacity-60"
                            >
                                <span>{month}</span>
                                <span className="block text-xs text-gray-500">
                                    {pendingMonths.has(month) ? "Gateway verification pending" : `Pay ${money(data.course_fee)}`}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <History size={18} /> Payment Records
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1F4E79] text-white text-xs uppercase">
                            <tr>
                                <th className="p-4">Month</th>
                                <th className="p-4 hidden md:table-cell">Date</th>
                                <th className="p-4 hidden md:table-cell">Trx ID</th>
                                <th className="p-4 hidden sm:table-cell">Method</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.history.map((txn) => (
                                <tr key={txn.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4 font-bold text-gray-800">{txn.month}</td>
                                    <td className="p-4 text-gray-600 hidden md:table-cell">
                                        {txn.date ? new Date(txn.date).toLocaleDateString() : "-"}
                                    </td>
                                    <td className="p-4 font-mono text-xs text-gray-500 hidden md:table-cell">{txn.trx_id || "-"}</td>
                                    <td className="p-4 text-gray-600 hidden sm:table-cell">{txn.method}</td>
                                    <td className="p-4 font-bold">{money(txn.amount)}</td>
                                    <td className="p-4 text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${statusClass[txn.status] || statusClass.due}`}>
                                            {txn.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.history.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-10 text-center text-gray-400">
                                        No payment history found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
