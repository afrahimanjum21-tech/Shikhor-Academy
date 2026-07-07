import { useEffect, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Banknote, Search, CheckCircle, FileText, Settings } from "lucide-react";

export default function PaymentManager() {
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [students, setStudents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        student_id: '', month: '', amount: '', method: 'Cash', date: '', trx_id: ''
    });

    const fetchData = async () => {
        try {
            const [payRes, stdRes] = await Promise.all([
                api.get('/admin/payments'),
                api.get('/admin/students')
            ]);
            setPayments(payRes.data);
            setStudents(stdRes.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/payments', formData);
            alert("Payment Recorded!");
            setIsModalOpen(false);
            setFormData({ student_id: '', month: '', amount: '', method: 'Cash', date: '', trx_id: '' });
            fetchData();
        } catch (err) { alert(err.response?.data?.message || "Failed to record payment"); }
    };

    const handleDelete = async (id) => {
        if(confirm("Delete this record?")) {
            await api.delete(`/admin/payments/${id}`);
            fetchData();
        }
    };

    const filteredPayments = payments.filter(p => 
        p.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.trx_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded shadow border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#1F4E79]">Payment History</h1>
                    <p className="text-sm text-gray-500">Track student tuition fees</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 border rounded text-sm focus:border-[#1F4E79] outline-none" onChange={e => setSearchTerm(e.target.value)} />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    </div>
                    <button onClick={() => navigate('/admin/payment-settings')} className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-50" title="Configure SSLCommerz Gateway">
                        <Settings size={16} /> <span className="hidden sm:inline">Settings</span>
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-[#1F4E79] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-[#163859]">
                        <Plus size={16} /> Add Payment
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                        <tr><th className="p-3">Student</th><th className="p-3">Month</th><th className="p-3">Amount</th><th className="p-3 hidden md:table-cell">Method</th><th className="p-3 hidden md:table-cell">Status</th><th className="p-3 hidden md:table-cell">Date</th><th className="p-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredPayments.map(pay => (
                            <tr key={pay.id} className="hover:bg-gray-50 transition">
                                <td className="p-3">
                                    <p className="font-bold text-gray-800">{pay.student?.user?.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{pay.student?.student_id_card_no}</p>
                                </td>
                                <td className="p-3">{pay.month}</td>
                                <td className="p-3 font-bold text-[#1F4E79]">BDT {Number(pay.amount || 0).toLocaleString("en-BD")}</td>
                                <td className="p-3 hidden md:table-cell"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-100">{pay.method}</span></td>
                                <td className="p-3 hidden md:table-cell">
                                    <span className={`px-2 py-0.5 rounded text-xs border font-bold uppercase ${
                                        pay.status === 'paid'
                                            ? 'bg-green-50 text-green-700 border-green-100'
                                            : pay.status === 'pending'
                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                : 'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                        {pay.status}
                                    </span>
                                </td>
                                <td className="p-3 hidden md:table-cell text-gray-500">{pay.date}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleDelete(pay.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-[#1F4E79] border-b pb-2">Record New Payment</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Student</label>
                                <select className="w-full border p-2 rounded text-sm bg-white mt-1 focus:border-[#1F4E79] outline-none" required onChange={e => setFormData({...formData, student_id: e.target.value})}>
                                    <option value="">-- Select Student --</option>
                                    {students.map(std => (
                                        <option key={std.id} value={std.student_profile?.id}>{std.name} (ID: {std.student_profile?.student_id_card_no})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500">Month</label><input className="w-full border p-2 rounded text-sm mt-1" placeholder="e.g. Jan 2026" required onChange={e => setFormData({...formData, month: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-gray-500">Amount</label><input type="number" className="w-full border p-2 rounded text-sm mt-1" required onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-gray-500">Date</label><input type="date" className="w-full border p-2 rounded text-sm mt-1" required onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-gray-500">Method</label>
                                    <select className="w-full border p-2 rounded text-sm bg-white mt-1" onChange={e => setFormData({...formData, method: e.target.value})}>
                                        <option value="Cash">Cash</option>
                                        <option value="Bkash">Bkash</option>
                                        <option value="Nagad">Nagad</option>
                                        <option value="Bank">Bank</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-xs font-bold text-gray-500">Trx ID (Optional)</label><input className="w-full border p-2 rounded text-sm mt-1" onChange={e => setFormData({...formData, trx_id: e.target.value})} /></div>
                            
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-[#1F4E79] text-white rounded hover:bg-[#163859]">Save Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
