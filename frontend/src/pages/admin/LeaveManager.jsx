import { useEffect, useState } from "react";
import api from "../../services/api";
import { useNotificationCounts } from "../../context/NotificationContext";
import { Search, CheckCircle, XCircle, Clock, MoreVertical, Check, X, Loader2 } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';
 
export default function LeaveManager() {
    const confirm = useConfirm();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const { markViewed } = useNotificationCounts();

    const fetchRequests = async () => {
        try {
            const { data } = await api.get("/admin/attendance/leave-requests");
            setRequests(data);
        } catch (err) { logger.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchRequests();
        markViewed('leaves');
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(visibleReqs.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedIds.length === 0) return;
        const ok1 = await confirm({ title: "Confirm Action", message: `Are you sure you want to ${action} ${selectedIds.length} leave request(s)?`, confirmText: "Confirm", variant: "destructive" }); if (!ok1) return;

        setActionLoading(true);
        try {
            for (const id of selectedIds) {
                await api.post(`/admin/attendance/leave-requests/${id}/${action}`);
            }
            setRequests(prev => prev.map(r =>
                selectedIds.includes(r.id) ? { ...r, leave_status: action === 'approve' ? 'approved' : 'rejected' } : r
            ));
            setSelectedIds([]);
        } catch (err) {
            notify.error("Action failed!");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSingleAction = async (id, action) => {
        const ok2 = await confirm({ title: "Confirm Action", message: `${action === 'approve' ? 'Approve' : 'Reject'} this leave request?`, confirmText: "Confirm", variant: "destructive" }); if (!ok2) return;

        setActionLoading(true);
        try {
            await api.post(`/admin/attendance/leave-requests/${id}/${action}`);
            setRequests(prev => prev.map(r =>
                r.id === id ? { ...r, leave_status: action === 'approve' ? 'approved' : 'rejected' } : r
            ));
            setOpenMenuId(null);
        } catch (err) { notify.error("Failed"); }
        finally { setActionLoading(false); }
    };

    const visibleReqs = requests.filter(r => {
        const matchesSearch = r.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
        const isPending = r.leave_status === 'pending';
        return matchesSearch && isPending;
    });

    const formatDate = (d) => {
        if (!d) return "-";
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200 relative min-h-[500px]">

            {/* Header */}
            <div className="section-header mb-6">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-[#1F4F78]">Leave Requests</h1>
                    <p className="text-xs md:text-sm text-gray-500">
                        {visibleReqs.length} requests needing attention
                    </p>
                </div>
                <div className="relative w-full sm:w-48">
                    <input
                        type="text" placeholder="Search..."
                        className="w-full border border-gray-300 rounded pl-2 pr-8 py-1 focus:border-[#1F4F78] text-sm focus:outline-none"
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-2 top-1.5 text-gray-400" size={16} />
                </div>
            </div>

            {/* Loading Overlay */}
            {actionLoading && (
                <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-[#1F4F78] text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Processing...</span>
                    </div>
                </div>
            )}

            {/* Bulk Action Toolbar */}
            {selectedIds.length > 0 && (
                <>
                <div className="hidden md:flex absolute top-2 left-1/2 transform -translate-x-1/2 bg-[#1F4F78] text-white px-6 py-2.5 rounded-full shadow-2xl items-center gap-5 z-20 border-2 border-white animate-bounce-in">
                    <span className="text-sm font-bold">{selectedIds.length} Selected</span>
                    <div className="h-5 w-[1px] bg-white/40"></div>

                    <button onClick={() => handleBulkAction('approve')} className="text-xs font-bold hover:text-green-300 flex items-center gap-1 transition">
                        <CheckCircle size={16} /> Approve
                    </button>
                    <button onClick={() => handleBulkAction('reject')} className="text-xs font-bold hover:text-red-300 flex items-center gap-1 transition">
                        <XCircle size={16} /> Reject
                    </button>
                </div>
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1F4F78] text-white px-4 py-3 shadow-2xl z-50 flex items-center gap-3">
                  <span className="text-sm font-bold flex-shrink-0">{selectedIds.length} selected</span>
                  <div className="flex gap-2 flex-1 justify-end">
                    <button onClick={() => handleBulkAction('approve')} className="text-xs font-bold px-3 py-1.5 bg-green-500 rounded-lg">Approve</button>
                    <button onClick={() => handleBulkAction('reject')} className="text-xs font-bold px-3 py-1.5 bg-red-500 rounded-lg">Reject</button>
                  </div>
                </div>
                </>
            )}

            {/* Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th className="p-3 w-10 text-center">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={visibleReqs.length > 0 && selectedIds.length === visibleReqs.length}
                                    className="cursor-pointer"
                                />
                            </th>
                            <th className="p-3">Student Name</th>
                            <th className="p-3 hidden md:table-cell">Date & Session</th>
                            <th className="p-3 hidden md:table-cell">Reason</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700">
                        {loading ? (
                            <tr><td colSpan="6" className="p-6 text-center">Loading...</td></tr>
                        ) : visibleReqs.map(r => (
                            <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 transition ${selectedIds.includes(r.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(r.id)}
                                        onChange={() => handleSelectOne(r.id)}
                                        className="cursor-pointer"
                                    />
                                </td>

                                <td className="p-3">
                                    <p className="font-semibold text-[#1F4F78]">{r.student?.user?.name || "Unknown"}</p>
                                    <div className="md:hidden text-xs text-gray-400 mt-1">
                                        {formatDate(r.date)} - {r.session} <br /> {r.leave_reason}
                                    </div>
                                </td>

                                <td className="p-3 hidden md:table-cell">
                                    <p className="font-medium">{formatDate(r.date)}</p>
                                    <p className="text-xs text-gray-400 capitalize">{r.session} session</p>
                                </td>

                                <td className="p-3 hidden md:table-cell max-w-[200px]">
                                    <p className="text-gray-600 truncate" title={r.leave_reason}>{r.leave_reason || "No reason provided"}</p>
                                </td>

                                <td className="p-3">
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border
                                        ${r.leave_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                          r.leave_status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                          'bg-red-50 text-red-700 border-red-200'}`}>
                                        {r.leave_status}
                                    </span>
                                </td>

                                <td className="p-3 text-center relative">
                                    <button
                                        className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === r.id ? null : r.id);
                                        }}
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {openMenuId === r.id && (
                                        <div className="absolute right-8 top-0 mt-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-50">
                                            <button onClick={() => handleSingleAction(r.id, 'approve')} className="w-full px-4 py-2 text-xs text-green-600 hover:bg-green-50 flex items-center gap-2 border-b">
                                                <Check size={14} /> Approve
                                            </button>
                                            <button onClick={() => handleSingleAction(r.id, 'reject')} className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <X size={14} /> Reject
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!loading && visibleReqs.length === 0 && (
                            <tr><td colSpan="6" className="p-10 text-center text-gray-400">No pending leave requests.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="p-6 text-center">Loading...</div>
              ) : visibleReqs.map(r => (
                <div key={r.id} className={`bg-white rounded-lg border p-3 shadow-sm ${selectedIds.includes(r.id) ? 'border-[#1F4F78] ring-1 ring-[#1F4F78]/30' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => handleSelectOne(r.id)}
                      className="mt-1 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1F4F78] text-sm">{r.student?.user?.name || "Unknown"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(r.date)} - {r.session} session</p>
                      <p className="text-xs text-gray-400 truncate mt-1">{r.leave_reason || "No reason provided"}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${r.leave_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : r.leave_status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{r.leave_status}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleSingleAction(r.id, 'approve')} className="text-xs font-bold px-2.5 py-1 bg-green-500 text-white rounded">Approve</button>
                          <button onClick={() => handleSingleAction(r.id, 'reject')} className="text-xs font-bold px-2.5 py-1 bg-red-500 text-white rounded">Reject</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && visibleReqs.length === 0 && (
                <div className="p-10 text-center text-gray-400">No pending leave requests.</div>
              )}
            </div>
        </div>
    );
}
