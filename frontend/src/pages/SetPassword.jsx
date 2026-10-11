import { useState } from "react";
import PageBackground from "../components/common/PageBackground";
import PasswordInput from "../components/common/PasswordInput";
import usePageMeta from "../hooks/usePageMeta";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";

// E5 — student sets their own password from the one-time link emailed on
// admission approval (no plaintext password is ever sent). The token is read
// from the URL and submitted to POST /set-password.
export default function SetPassword() {
    usePageMeta({
        title: "Set Your Password — Uttoron Coaching Centre",
        description: "Set the password for your Uttoron Coaching Centre student account.",
        path: "/set-password",
    });
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!token) {
            setError("This link is invalid or incomplete. Please use the link from your email.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await api.post("/set-password", { token, password });
            setDone(true);
            setTimeout(() => navigate("/login"), 2500);
        } catch (err) {
            setError(err.response?.data?.message || "Could not set your password. The link may have expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <PageBackground />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10 max-w-md w-full"
            >
                {done ? (
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 text-green-600">
                            <CheckCircle2 size={28} />
                        </div>
                        <h2 className="text-2xl font-bold text-[#1F4E79]">Password set!</h2>
                        <p className="text-gray-500 mt-2">You can now log in with your new password. Redirecting you to login…</p>
                        <Link to="/login" className="inline-block mt-6 font-semibold text-[#1F4E79] hover:underline">Go to login</Link>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-full bg-[#E6EEF5] flex items-center justify-center mx-auto mb-4 text-[#1F4E79]">
                                <KeyRound size={28} />
                            </div>
                            <h2 className="text-3xl font-bold text-[#1F4E79]">Set Your Password</h2>
                            <p className="text-gray-500 mt-1">Choose a password for your student account</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm text-center border border-red-100">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">New Password</label>
                                <PasswordInput
                                    className="w-full border-b border-gray-200 focus:border-[#1F4E79] transition-all outline-none bg-transparent text-sm py-2.5"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Confirm Password</label>
                                <PasswordInput
                                    className="w-full border-b border-gray-200 focus:border-[#1F4E79] transition-all outline-none bg-transparent text-sm py-2.5"
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-full px-6 py-3 bg-[#1F4E79] text-white font-semibold hover:bg-[#1a3d66] transition-colors disabled:opacity-60"
                            >
                                {loading ? 'Setting password…' : 'Set Password'}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-sm text-gray-500">
                            Already set it?{' '}
                            <Link to="/login" className="font-semibold text-[#1F4E79] hover:underline">Log in</Link>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
