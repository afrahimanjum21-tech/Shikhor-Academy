import { useEffect, useState } from "react";
import api from "../../services/api";
import { CheckCircle2, CreditCard, Loader2, Save, ShieldCheck } from "lucide-react";
import PasswordInput from "../../components/common/PasswordInput";

const defaultForm = {
    is_active: false,
    mode: "sandbox",
    store_id: "",
    store_password: "",
    enabled_methods: ["sslcommerz"],
    settlement_account_name: "",
    settlement_account_number: "",
    settlement_bank: "",
    instructions: "",
};

export default function PaymentSettings() {
    const [form, setForm] = useState(defaultForm);
    const [hasPassword, setHasPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/admin/payment-settings")
            .then((res) => {
                setForm({ ...defaultForm, ...res.data, store_password: "" });
                setHasPassword(Boolean(res.data.has_store_password));
            })
            .catch((err) => setError(err.response?.data?.message || "Unable to load payment settings"))
            .finally(() => setLoading(false));
    }, []);

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const payload = { ...form };
            if (!payload.store_password) delete payload.store_password;

            const { data } = await api.post("/admin/payment-settings", payload);
            setForm({ ...defaultForm, ...data.settings, store_password: "" });
            setHasPassword(Boolean(data.settings?.has_store_password));
            setMessage(data.message || "Payment settings saved");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save payment settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-[#1F4E79] flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Loading payment settings...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                        <CreditCard size={26} /> Payment Settings
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure where online payments go and which gateway method students can use.
                    </p>
                </div>
                <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${form.is_active ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    {form.is_active ? "Online payment active" : "Online payment disabled"}
                </div>
            </div>

            {message && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle2 size={16} /> {message}
                </div>
            )}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={save} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-5">
                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="font-bold text-gray-800">SSLCommerz Merchant Account</h2>
                            <p className="text-xs text-gray-500 mt-1">Money will settle to the merchant account attached to this store.</p>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(event) => update("is_active", event.target.checked)}
                                className="h-4 w-4"
                            />
                            Active
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Store ID" value={form.store_id || ""} onChange={(value) => update("store_id", value)} required={form.is_active} />
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Store Password</label>
                            <PasswordInput
                                value={form.store_password}
                                onChange={(event) => update("store_password", event.target.value)}
                                placeholder={hasPassword ? "Saved. Enter only to replace" : "Required before activation"}
                                className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mode</label>
                            <select
                                value={form.mode}
                                onChange={(event) => update("mode", event.target.value)}
                                className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79] bg-white"
                            >
                                <option value="sandbox">Sandbox</option>
                                <option value="live">Live</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Payment Method</label>
                            <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700">
                                SSLCommerz hosted checkout
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                        <h2 className="font-bold text-gray-800 mb-3">Settlement Reference</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Account Name" value={form.settlement_account_name || ""} onChange={(value) => update("settlement_account_name", value)} />
                            <Field label="Account Number" value={form.settlement_account_number || ""} onChange={(value) => update("settlement_account_number", value)} />
                            <Field label="Bank / MFS Name" value={form.settlement_bank || ""} onChange={(value) => update("settlement_bank", value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Admin Notes</label>
                        <textarea
                            value={form.instructions || ""}
                            onChange={(event) => update("instructions", event.target.value)}
                            rows="3"
                            className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79]"
                            placeholder="Internal note about settlement, gateway contract, or reconciliation process"
                        />
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 h-fit space-y-4">
                    <div className="h-11 w-11 rounded-lg bg-blue-50 text-[#1F4E79] flex items-center justify-center">
                        <ShieldCheck size={22} />
                    </div>
                    <h2 className="font-bold text-gray-800">How this works</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Student payments go to the SSLCommerz merchant store configured here. The settlement bank or MFS account is controlled inside your SSLCommerz merchant agreement.
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Keep sandbox mode for testing. Switch to live only after entering the real store credentials.
                    </p>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded bg-[#1F4E79] px-4 py-3 text-sm font-bold text-white hover:bg-[#163859] disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, value, onChange, required = false }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{label}</label>
            <input
                value={value}
                required={required}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79]"
            />
        </div>
    );
}
