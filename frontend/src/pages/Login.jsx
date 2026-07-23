import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import PageBackground from "../components/common/PageBackground";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await login({ email, password });

            if (result.success) {
                const storedUser = JSON.parse(localStorage.getItem('USER'));
                if (storedUser.role === 'admin' || storedUser.role === 'super_admin') navigate("/admin/dashboard");
                else if (storedUser.role === 'student') navigate(location.state?.from || "/student/dashboard");
                else navigate("/");
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
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
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-[#E6EEF5] flex items-center justify-center mx-auto mb-4 text-[#1F4E79]">
                        <LogIn size={28} />
                    </div>
                    <h2 className="text-3xl font-bold text-[#1F4E79]">Welcome Back</h2>
                    <p className="text-gray-500 mt-1">Login to access your dashboard</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Email Address</label>
                        <input
                            type="email"
                            className="w-full border-b border-gray-200 focus:border-[#1F4E79] transition-all outline-none bg-transparent text-sm py-2.5"
                            placeholder="example@uttoron.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Password</label>
                        <input
                            type="password"
                            className="w-full border-b border-gray-200 focus:border-[#1F4E79] transition-all outline-none bg-transparent text-sm py-2.5"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-full px-6 py-3 bg-[#1F4E79] text-white font-semibold hover:bg-[#1a3d66] transition-colors disabled:opacity-60"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Link to="/admission" className="font-semibold text-[#1F4E79] hover:underline">
                        Apply for Admission
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
