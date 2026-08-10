import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function VerifyCredentialChange() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const [state, setState] = useState({ status: "loading", message: "" });

    useEffect(() => {
        if (!token) {
            setState({ status: "error", message: "Missing verification token. Use the link from your email." });
            return;
        }
        let cancelled = false;
        api.get(`/verify-credential-change?token=${encodeURIComponent(token)}`)
            .then((res) => {
                if (cancelled) return;
                setState({ status: "success", message: res.data.message || "Your credentials have been updated." });
            })
            .catch((err) => {
                if (cancelled) return;
                setState({ status: "error", message: err.response?.data?.message || "Verification failed. The link may be invalid or expired." });
            });
        return () => { cancelled = true; };
    }, [token]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
                <div className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-4 ${state.status === 'loading' ? 'bg-blue-50' : state.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {state.status === "loading" && <Loader2 size={26} className="text-blue-600 animate-spin" />}
                    {state.status === "success" && <CheckCircle2 size={26} className="text-green-600" />}
                    {state.status === "error" && <XCircle size={26} className="text-red-600" />}
                </div>

                <h1 className="text-lg font-bold text-gray-900 mb-2">
                    {state.status === "loading" && "Verifying your request..."}
                    {state.status === "success" && "Change Confirmed"}
                    {state.status === "error" && "Verification Failed"}
                </h1>
                <p className="text-sm text-gray-600 leading-relaxed">{state.message}</p>

                {state.status !== "loading" && (
                    <div className="mt-6 space-y-2">
                        <Link to="/login" className="block w-full py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-[#1a4166] transition-colors">
                            Go to Login
                        </Link>
                        {state.status === "success" && (
                            <p className="text-xs text-gray-400">Please log in again with your updated credentials.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
