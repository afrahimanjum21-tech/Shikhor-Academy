import { useEffect, useState } from "react";
import api from "../../services/api";
import { useNotificationCounts } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Banknote, Search, Settings, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';

const PAGE_SIZE = 20;

export default function PaymentManager() {
    const confirm = useConfirm();
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [students, setStudents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        student_id: '', month: '', amount: '', method: 'Cash', date: '', trx_id: ''
    });

    const { markViewed } = useNotificationCounts();

    const fetchPayments = async (pageNo = page, q = searchTerm) => {
        try {
            setLoading(true);
            const res = await api.get('/admin/payments', {
                params: { page: pageNo, limit: PAGE_SIZE, q: q || undefined },
            });
            setPayments(res.data.payments || []);
            setPage(res.data.current_page || 1);
            setLastPage(res.data.last_page || 1);
            setTotal(res.data.total || 0);
        } catch (err) {
            logger.error('Failed to fetch payments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); markViewed('payments'); }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPayments(1, searchTerm);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchData = () => fetchPayments(1, searchTerm);

    const fetchStudents = async () => {
        if (students.length > 0) return;
        try {
            setStudentsLoading(true);
            const res = await api.get('/admin/students');
            setStudents(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            logger.error('Failed to fetch students:', err);
        } finally {
            setStudentsLoading(false);
        }
    };

    const handleOpenModal = () => {
        fetchStudents();
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/payments', formData);
            notify.success("Payment Recorded!");
            setIsModalOpen(false);
            setFormData({ student_id: '', month: '', amount: '', method: 'Cash', date: '', trx_id: '' });
            fetchData();
        } catch (err) { notify.error(err.response?.data?.message || "Failed to record payment"); }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Record?", message: "Delete this record?", confirmText: "Delete", variant: "destructive" }); if (ok) {
            await api.delete(`/admin/payments/${id}`);
            notify.success("Payment record deleted");
            fetchData();
        }
    };

    const openStudentHistory = (pay) => {
        const userId = pay.student?.user?.id;
        if (!userId) {
            notify.error("This payment has no linked student account");
            return;
        }
        navigate(`/admin/students/${userId}/payment-history`);
    };

    const studentName = (pay) => pay.student?.user?.name || pay.student?.user?.email || 'Unknown Student';
    const studentId = (pay) => pay.student?.student_id_card_no || '—';

    const goToPage = (nextPage) => {
        if (nextPage < 1 || nextPage > lastPage) return;
        fetchPayments(nextPage, searchTerm);
    };

    return (
        <div className="mobile-card">
            <div className="section-header">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-[#1F4E79]">Payment History</h1>
                    <p className="text-xs md:text-sm text-gray-500">Track student tuition fees</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                        <input
                            type="text"
                            placeholder="Search name, ID, month, trx..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 border rounded-lg text-sm focus:border-[#1F4E79] outline-none"
                        />
                        <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => navigate('/admin/payment-settings')} className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-gray-50"><Settings size={15} /></button>
                        <button onClick={handleOpenModal} className="bg-[#1F4E79] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-[#163859] flex-1 sm:flex-none"><Plus size={16} /> Add</button>
                    </div>
                </div>
            </div>

            {loading && payments.length === 0 ? (
                <div className="flex items-center justify-center min-h-[300px] text-gray-400">
                    <span className="animate-pulse">Loading payments...</span>
                </div>
            ) : payments.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center min-h-[300px]">
                    <Banknote className="mx-auto text-gray-300 mb-3" size={40} />
                    <p className="text-gray-500 font-medium">No payments found</p>
                    {searchTerm && <p className="text-xs text-gray-400 mt-1">Try a different search term or clear the search.</p>}
                </div>
            ) : (
                <>
                    <div className="hidden md:block overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                <tr><th className="p-3">Student</th><th className="p-3">Month</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {payments.map(pay => (
                                    <tr key={pay.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => openStudentHistory(pay)}>
                                        <td className="p-3">
                                            <p className="font-bold text-gray-800">{studentName(pay)}</p>
                                            <p className="text-xs text-gray-500 font-mono">{studentId(pay)}</p>
                                        </td>
                                        <td className="p-3">{pay.month}</td>
                                        <td className="p-3 font-bold text-[#1F4E79]">BDT {Number(pay.amount || 0).toLocaleString("en-BD")}</td>
                                        <td className="p-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-100">{pay.method}</span></td>
                                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs border font-bold uppercase ${pay.status === 'paid' ? 'bg-green-50 text-green-700 border-green-100' : pay.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{pay.status}</span></td>
                                        <td className="p-3 text-gray-500">{pay.date}</td>
                                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => openStudentHistory(pay)} title="View payment history" className="text-[#1F4E79] hover:bg-[#1F4E79]/10 p-1.5 rounded"><Eye size={16} /></button>
                                            <button onClick={() => handleDelete(pay.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-2 mt-2">
                        {payments.map(pay => (
                            <div key={pay.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer active:bg-gray-50" onClick={() => openStudentHistory(pay)}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 text-sm truncate">{studentName(pay)}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">{studentId(pay)}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => openStudentHistory(pay)} title="View payment history" className="text-[#1F4E79] hover:bg-[#1F4E79]/10 p-1 rounded"><Eye size={14} /></button>
                                        <button onClick={() => handleDelete(pay.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-500">{pay.month}</p>
                                        <p className="font-bold text-[#1F4E79] text-sm">BDT {Number(pay.amount || 0).toLocaleString("en-BD")}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-0.5 rounded text-[10px] border font-bold uppercase ${pay.status === 'paid' ? 'bg-green-50 text-green-700 border-green-100' : pay.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{pay.status}</span>
                                        <p className="text-[10px] text-gray-400 mt-1">{pay.date} • {pay.method}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {lastPage > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                                Showing page {page} of {lastPage} • {total} record{total === 1 ? '' : 's'}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page <= 1}
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-bold flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={15} /> Prev
                                </button>
                                <span className="text-sm font-bold text-[#1F4E79]">{page}</span>
                                <button
                                    onClick={() => goToPage(page + 1)}
                                    disabled={page >= lastPage}
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-bold flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Next <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 responsive-modal">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-[#1F4E79] border-b pb-2">Record New Payment</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Student</label>
                                <select className="w-full border p-2 rounded text-sm bg-white mt-1 focus:border-[#1F4E79] outline-none" required onChange={e => setFormData({...formData, student_id: e.target.value})}>
                                    <option value="">-- Select Student --</option>
                                    {studentsLoading && <option disabled>Loading students...</option>}
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
