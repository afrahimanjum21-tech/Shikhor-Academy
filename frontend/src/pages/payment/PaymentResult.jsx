import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock, CreditCard, Loader2, XCircle } from "lucide-react";
import api from "../../services/api";

const resultCopy = {
    success: {
        icon: CheckCircle2,
        title: "Payment Successful",
        tone: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200",
    },
    failed: {
        icon: XCircle,
        title: "Payment Failed",
        tone: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
    },
    cancelled: {
        icon: AlertCircle,
        title: "Payment Cancelled",
        tone: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
    },
    pending: {
        icon: Clock,
        title: "Verification Pending",
        tone: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
    },
};

export default function PaymentResult({ type = "pending" }) {
    const location = useLocation();
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const tranId = params.get("tran_id");
    const [payment, setPayment] = useState(null);
    const [status, setStatus] = useState(type);
    const [loading, setLoading] = useState(Boolean(tranId));
    const [error, setError] = useState("");

    useEffect(() => {
        if (!tranId) {
            setLoading(false);
            return;
        }

        let active = true;
        const loadStatus = async () => {
            try {
                const { data } = await api.get("/student/payment/status", { params: { tran_id: tranId } });
                if (!active) return;
                setPayment(data);
                setStatus(data.status === "paid" ? "success" : data.status === "pending" ? "pending" : type);
            } catch (err) {
                if (!active) return;
                setError(err.response?.data?.message || "Unable to load payment status");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadStatus();

        return () => {
            active = false;
        };
    }, [tranId, type]);

    const copy = resultCopy[status] || resultCopy.pending;
    const Icon = loading ? Loader2 : copy.icon;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
            <div className={`w-full max-w-xl rounded-lg border ${copy.border} bg-white shadow-sm overflow-hidden`}>
                <div className={`${copy.bg} px-6 py-8 text-center border-b ${copy.border}`}>
                    <div className={`mx-auto mb-4 h-14 w-14 rounded-full bg-white flex items-center justify-center ${copy.tone}`}>
                        <Icon size={32} className={loading ? "animate-spin" : ""} />
                    </div>
                    <h1 className={`text-2xl font-bold ${copy.tone}`}>
                        {loading ? "Checking Payment" : copy.title}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Transaction status is updated directly from the payment gateway verification.
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="rounded border border-gray-200 p-3">
                            <p className="text-xs font-bold uppercase text-gray-500">Transaction ID</p>
                            <p className="mt-1 font-mono text-gray-800 break-all">{tranId || "Not available"}</p>
                        </div>
                        <div className="rounded border border-gray-200 p-3">
                            <p className="text-xs font-bold uppercase text-gray-500">Gateway Status</p>
                            <p className="mt-1 font-bold capitalize text-gray-800">{payment?.status || status}</p>
                        </div>
                        <div className="rounded border border-gray-200 p-3">
                            <p className="text-xs font-bold uppercase text-gray-500">Month</p>
                            <p className="mt-1 font-bold text-gray-800">{payment?.month || "Not available"}</p>
                        </div>
                        <div className="rounded border border-gray-200 p-3">
                            <p className="text-xs font-bold uppercase text-gray-500">Amount</p>
                            <p className="mt-1 font-bold text-gray-800">৳{payment?.amount || "0.00"}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link
                            to="/student/fees"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-[#1F4E79] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#163859]"
                        >
                            <CreditCard size={16} />
                            View Fees
                        </Link>
                        <Link
                            to="/student/dashboard"
                            className="inline-flex flex-1 items-center justify-center rounded border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
