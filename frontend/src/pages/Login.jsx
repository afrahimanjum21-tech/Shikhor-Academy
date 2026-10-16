import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/common/PasswordInput";
import usePageMeta from "../hooks/usePageMeta";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
    usePageMeta({
        title: "Login — Shikhor Academy",
        description: "Sign in to your Shikhor Academy account for students, teachers and staff.",
        path: "/login",
    });
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
                const storedUser = JSON.parse(localStorage.getItem('USER') || '{}');
                if (storedUser.role === 'admin' || storedUser.role === 'super_admin') navigate("/admin/dashboard");
                else if (storedUser.role === 'student') navigate(location.state?.from || "/student/dashboard");
                else if (storedUser.role === 'teacher') navigate(location.state?.from || "/teacher/dashboard");
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
        <div className="bg-white">
            <section className="bg-ink text-white">
                <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brass">
                        Student and staff portal
                    </p>
                    <h1 className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
                        Welcome back to Shikhor Academy.
                    </h1>
                    <div className="mt-5 h-px w-16 bg-brass" />
                    <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                        Sign in to continue to your learning, teaching, or administration dashboard.
                    </p>
                </div>
            </section>

            <section className="bg-white px-5 py-10 sm:px-8 sm:py-16">
                <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-20">
                    <div className="hidden pt-4 lg:block">
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brass-100 text-ink">
                            <ShieldCheck size={25} aria-hidden="true" />
                        </div>
                        <h2 className="max-w-md font-display text-3xl leading-tight text-ink">
                            One secure place for your academic journey.
                        </h2>
                        <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
                            Use the account provided by your academy to access your personal dashboard and keep your learning moving forward.
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-9"
                    >
                        <div className="mb-7">
                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6EEF5] text-ink">
                                <LockKeyhole size={21} aria-hidden="true" />
                            </div>
                            <h2 className="font-display text-3xl text-ink">Sign in</h2>
                            <p className="mt-2 text-sm text-slate-500">Enter your credentials to continue.</p>
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"
                            >
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-ink">
                                    Email address
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    autoComplete="email"
                                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-ink">
                                    Password
                                </label>
                                <PasswordInput
                                    id="login-password"
                                    autoComplete="current-password"
                                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink-700 focus:outline-none focus:ring-2 focus:ring-brass focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                                {!loading && <ArrowRight size={17} aria-hidden="true" />}
                            </button>
                        </form>

                        <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
                            Need an account?{' '}
                            <Link to="/admission" className="font-semibold text-ink underline decoration-brass underline-offset-4 hover:text-ink-700">
                                Apply for admission
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
