import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/common/PasswordInput";
import {
    CheckCircle2,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    ShieldCheck,
} from "lucide-react";

export default function SecuritySettings() {
    const { user } = useAuth();
    const [form, setForm] = useState({ currentPassword: "", newEmail: "", newPassword: "", confirmPassword: "" });
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (!form.currentPassword) {
            setError("Current password is required to confirm your identity.");
            return;
        }

        if (!form.newEmail.trim() && !form.newPassword) {
            setError("Provide a new email and/or a new password.");
            return;
        }

        if (form.newEmail.trim()) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail.trim())) {
                setError("Enter a valid new email address.");
                return;
            }
            if (form.newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
                setError("New email is the same as your current email.");
                return;
            }
        }

        if (form.newPassword && form.newPassword.length < 8) {
            setError("New password must be at least 8 characters.");
            return;
        }

        if (form.newPassword && form.newPassword !== form.confirmPassword) {
            setError("New password and confirm password do not match.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = { currentPassword: form.currentPassword };
            if (form.newEmail.trim()) payload.newEmail = form.newEmail.trim();
            if (form.newPassword) payload.newPassword = form.newPassword;
            const res = await api.post("/admin/change-credentials", payload);
            setMessage(res.data.message || "A confirmation email has been sent. Check your inbox (and spam folder). The link expires in 30 minutes.");
            setSent(true);
            setForm({ currentPassword: "", newEmail: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send verification email. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] text-sm bg-white";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-[#1F4E79]" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Security Settings</h1>
                    <p className="text-sm text-gray-500">Change your admin sign-in email and admin login password.</p>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Mail size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                    <p className="font-semibold">Current admin sign-in email: <span className="font-mono">{user?.email}</span></p>
                    <p className="mt-1 text-blue-800/80">After you submit, a confirmation email will be sent to this address. The change is applied only after you click the confirm link — nothing changes before that.</p>
                </div>
            </div>

            {sent && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-900">
                        <p className="font-semibold">Verification email sent!</p>
                        <p className="mt-1 text-green-800/80">{message} Check your inbox (and spam folder). The link expires in 30 minutes.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                        <Lock size={14} /> Current Password <span className="text-red-500">*</span>
                    </label>
                    <PasswordInput className={inputCls} value={form.currentPassword} onChange={(e) => update("currentPassword", e.target.value)} placeholder="Enter your current admin login password" />
                </div>

                <div className="border-t border-gray-100 pt-5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                        <Mail size={14} /> New Admin Sign-in Email (optional)
                    </label>
                    <input type="email" className={inputCls} value={form.newEmail} onChange={(e) => update("newEmail", e.target.value)} placeholder="newemail@example.com" />
                    <p className="text-xs text-gray-400 mt-1">This is the email used to log in to the admin panel. Future verification emails and password resets go to this address.</p>
                </div>

                <div className="border-t border-gray-100 pt-5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                        <KeyRound size={14} /> New Admin Login Password (optional)
                    </label>
                    <PasswordInput className={inputCls} value={form.newPassword} onChange={(e) => update("newPassword", e.target.value)} placeholder="At least 8 characters" />
                    <p className="text-xs text-gray-400 mt-1">This is the password you use to log in to the admin panel. The site's SMTP/Gmail app password is configured in Site Settings, not here.</p>
                </div>

                <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                        <Lock size={14} /> Confirm New Admin Login Password
                    </label>
                    <PasswordInput className={inputCls} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Repeat the new admin login password" />
                </div>

                <button type="submit" disabled={submitting} className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-semibold hover:bg-[#1a4166] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {submitting ? "Sending verification email..." : "Send Verification Email"}
                </button>
            </form>
        </div>
    );
}
