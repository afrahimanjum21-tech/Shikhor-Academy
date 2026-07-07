import { useEffect, useState } from "react";
import api from "../../services/api";
import { Search, CheckCircle, XCircle, Clock, MoreVertical, Check, X, Loader2 } from "lucide-react";

export default function AdmissionManager() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // সিলেকশন স্টেট
    const [selectedIds, setSelectedIds] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);

    // অ্যাকশন লোডিং স্টেট (যাতে বাটন চাপলে বোঝা যায় কাজ হচ্ছে)
    const [actionLoading, setActionLoading] = useState(false);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [credentials, setCredentials] = useState({ email: '', password: '' });

    const fetchApplications = async () => {
        try {
            const res = await api.get('/admin/admissions'); 
            setApplications(res.data);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchApplications();
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    // চেকবক্স হ্যান্ডলার
    const handleSelectAll = (e) => {
        // স্ক্রিনে যা দেখা যাচ্ছে শুধু সেগুলোই সিলেক্ট হবে
        if (e.target.checked) {
            setSelectedIds(visibleApps.map(app => app.id));
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

    // বাল্ক অ্যাকশন
    const handleBulkAction = async (action) => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} application(s)?`)) return;

        setActionLoading(true); // লোডিং শুরু
        try {
            const res = await api.post('/admin/admission/bulk-action', {
                ids: selectedIds,
                action: action
            });
            alert(res.data.message);
            
            // লোকাল স্টেট আপডেট (যাতে পেজ রিফ্রেশ না লাগে)
            setApplications(prev => prev.map(app => 
                selectedIds.includes(app.id) ? { ...app, status: action } : app
            ));
            
            setSelectedIds([]); 
        } catch (err) {
            alert("Action failed! Check server logs.");
        } finally {
            setActionLoading(false); // লোডিং শেষ
        }
    };

    // সিঙ্গেল অ্যাপ্রুভাল মডাল
    const openApproveModal = (app) => {
        setSelectedApp(app);
        setCredentials({ 
            email: app.email || '', 
            password: '' 
        });
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const confirmApprove = async (e) => {
        e.preventDefault();
        setActionLoading(true); // লোডিং শুরু
        try {
            await api.post(`/admin/admission/approve/${selectedApp.id}`, credentials);
            alert(`Student Approved & Email Sent!`);
            
            // লিস্ট থেকে সরিয়ে ফেলা (Status Approved করে দেওয়া)
            setApplications(prev => prev.map(app => 
                app.id === selectedApp.id ? { ...app, status: 'approved' } : app
            ));

            setIsModalOpen(false);
        } catch (err) { 
            alert(err.response?.data?.message || "Failed. Email might be invalid."); 
        } finally {
            setActionLoading(false); // লোডিং শেষ
        }
    };

    const handleSingleAction = async (id, action) => {
        if(!confirm(`${action === 'reject' ? 'Reject' : 'Hold'} this application?`)) return;
        
        setActionLoading(true);
        try {
             await api.post('/admin/admission/bulk-action', {
                ids: [id],
                action: action
            });
            
            // স্টেট আপডেট
            setApplications(prev => prev.map(app => 
                app.id === id ? { ...app, status: action } : app
            ));
            
            setOpenMenuId(null);
        } catch (err) { alert("Failed"); }
        finally { setActionLoading(false); }
    };

    // 🔥 ফিল্টারিং লজিক (আসল ফিক্স)
    // ১. নাম বা ইমেইল দিয়ে সার্চ
    // ২. শুধুমাত্র 'pending' এবং 'hold' স্ট্যাটাস দেখাবে
    // ৩. 'approved' বা 'rejected' হলে লিস্ট থেকে গায়েব হয়ে যাবে
    const visibleApps = applications.filter(app => {
        const matchesSearch = app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              app.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const isVisibleStatus = app.status === 'pending' || app.status === 'hold';

        return matchesSearch && isVisibleStatus;
    });

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200 relative min-h-[500px]">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl font-bold text-[#1F4F78]">Admission Requests</h1>
                    <p className="text-sm text-gray-500">
                        {visibleApps.length} requests needing attention
                    </p>
                </div>
                <div className="relative w-48">
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
                        <span>Processing & Sending Email...</span>
                    </div>
                </div>
            )}

            {/* Bulk Action Toolbar */}
            {selectedIds.length > 0 && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-[#1F4F78] text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-5 z-20 border-2 border-white animate-bounce-in">
                    <span className="text-sm font-bold">{selectedIds.length} Selected</span>
                    <div className="h-5 w-[1px] bg-white/40"></div>
                    
                    <button onClick={() => handleBulkAction('approve')} className="text-xs font-bold hover:text-green-300 flex items-center gap-1 transition">
                        <CheckCircle size={16}/> Approve
                    </button>
                    <button onClick={() => handleBulkAction('hold')} className="text-xs font-bold hover:text-yellow-300 flex items-center gap-1 transition">
                        <Clock size={16}/> Hold
                    </button>
                    <button onClick={() => handleBulkAction('reject')} className="text-xs font-bold hover:text-red-300 flex items-center gap-1 transition">
                        <XCircle size={16}/> Reject
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th className="p-3 w-10 text-center">
                                <input 
                                    type="checkbox" 
                                    onChange={handleSelectAll} 
                                    checked={visibleApps.length > 0 && selectedIds.length === visibleApps.length}
                                    className="cursor-pointer"
                                />
                            </th>
                            <th className="p-3">Applicant Name</th>
                            <th className="p-3 hidden md:table-cell">Applied Course</th>
                            <th className="p-3 hidden md:table-cell">Contact Info</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700">
                        {loading ? (
                            <tr><td colSpan="6" className="p-6 text-center">Loading...</td></tr>
                        ) : visibleApps.map(app => (
                            <tr key={app.id} className={`border-b border-gray-100 hover:bg-gray-50 transition ${selectedIds.includes(app.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-3 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(app.id)}
                                        onChange={() => handleSelectOne(app.id)}
                                        className="cursor-pointer"
                                    />
                                </td>
                                
                                <td className="p-3">
                                    <p className="font-semibold text-[#1F4F78]">{app.full_name}</p>
                                    <div className="md:hidden text-xs text-gray-400 mt-1">
                                        {app.course?.title} <br/> {app.phone}
                                    </div>
                                </td>

                                <td className="p-3 hidden md:table-cell text-gray-600 font-medium">{app.course?.title || 'N/A'}</td>
                                
                                <td className="p-3 hidden md:table-cell">
                                    <p>{app.phone}</p>
                                    <p className="text-xs text-gray-400">{app.email}</p>
                                </td>

                                <td className="p-3">
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border
                                        ${app.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                          app.status === 'hold' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}`}>
                                        {app.status}
                                    </span>
                                </td>

                                <td className="p-3 text-center relative">
                                    <button 
                                        className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === app.id ? null : app.id);
                                        }}
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {openMenuId === app.id && (
                                        <div className="absolute right-8 top-0 mt-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-50">
                                            <button onClick={() => openApproveModal(app)} className="w-full px-4 py-2 text-xs text-green-600 hover:bg-green-50 flex items-center gap-2 border-b">
                                                <Check size={14}/> Approve
                                            </button>
                                            {/* Hold Button */}
                                            {app.status !== 'hold' && (
                                                <button onClick={() => handleSingleAction(app.id, 'hold')} className="w-full px-4 py-2 text-xs text-yellow-600 hover:bg-yellow-50 flex items-center gap-2 border-b">
                                                    <Clock size={14}/> Hold
                                                </button>
                                            )}
                                            <button onClick={() => handleSingleAction(app.id, 'reject')} className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <X size={14}/> Reject
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!loading && visibleApps.length === 0 && (
                            <tr><td colSpan="6" className="p-10 text-center text-gray-400">No pending/hold requests.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Approval Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded shadow-xl w-full max-w-sm">
                        <h3 className="font-bold text-lg mb-2 text-[#1F4F78]">Confirm Admission</h3>
                        <p className="text-xs text-gray-500 mb-4">Set login details for {selectedApp?.full_name}</p>
                        <form onSubmit={confirmApprove} className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Login Email</label>
                                <input className="w-full border p-2 rounded text-sm mt-1 focus:outline-none focus:border-[#1F4F78]" required type="email" value={credentials.email} onChange={e => setCredentials({...credentials, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Password</label>
                                <input className="w-full border p-2 rounded text-sm mt-1 focus:outline-none focus:border-[#1F4F78]" placeholder="Set Password" required value={credentials.password} onChange={e => setCredentials({...credentials, password: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-3 py-1.5 text-sm bg-[#1F4F78] text-white rounded hover:bg-[#163859]">
                                    {actionLoading ? 'Processing...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}