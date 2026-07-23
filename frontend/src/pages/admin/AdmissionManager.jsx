import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { useNotificationCounts } from "../../context/NotificationContext";
import { Search, CheckCircle, XCircle, Clock, MoreVertical, Check, X, Loader2, Eye, ArrowLeft } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';
 
export default function AdmissionManager() {
    const confirm = useConfirm();
    const { markViewed } = useNotificationCounts();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Detail view
    const [detailApp, setDetailApp] = useState(null);

    // Approval Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [credentials, setCredentials] = useState({ email: '', password: '' });

    const fetchApplications = async () => {
        try {
            const res = await api.get('/admin/admissions'); 
            setApplications(res.data);
        } catch (err) { logger.error(err); } 
        finally { setLoading(false); }
    };

    useEffect(() => { 
        markViewed('admissions');
        fetchApplications();
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    const handleSelectAll = (e) => {
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

    const handleBulkAction = async (action) => {
        if (selectedIds.length === 0) return;
        const ok1 = await confirm({ title: "Confirm Action", message: `Are you sure you want to ${action} ${selectedIds.length} application(s)?`, confirmText: "Confirm", variant: "destructive" }); if (!ok1) return;

        setActionLoading(true);
        try {
            const res = await api.post('/admin/admission/bulk-action', {
                ids: selectedIds,
                action: action
            });
            notify.success(res.data.message);
            setApplications(prev => prev.map(app => 
                selectedIds.includes(app.id) ? { ...app, status: action } : app
            ));
            if (detailApp && selectedIds.includes(detailApp.id)) {
                setDetailApp(prev => ({ ...prev, status: action }));
            }
            setSelectedIds([]); 
        } catch (err) {
            notify.error("Action failed! Check server logs.");
        } finally {
            setActionLoading(false);
        }
    };

    const openApproveModal = (app) => {
        setSelectedApp(app);
        setCredentials({ email: app.email || '', password: '' });
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const confirmApprove = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await api.post(`/admin/admission/approve/${selectedApp.id}`, credentials);
            notify.success("Student Approved & Email Sent!");
            setApplications(prev => prev.map(app => 
                app.id === selectedApp.id ? { ...app, status: 'approved' } : app
            ));
            if (detailApp?.id === selectedApp.id) {
                setDetailApp(prev => ({ ...prev, status: 'approved' }));
            }
            setIsModalOpen(false);
        } catch (err) { 
            notify.error(err.response?.data?.message || "Failed. Email might be invalid."); 
        } finally {
            setActionLoading(false);
        }
    };

    const handleSingleAction = async (id, action) => {
        const ok2 = await confirm({ title: "Confirm Action", message: `${action === 'reject' ? 'Reject' : 'Hold'} this application?`, confirmText: "Confirm", variant: "destructive" }); if (!ok2) return;
        setActionLoading(true);
        try {
            await api.post(`/admin/admission/${action}/${id}`);
            setApplications(prev => prev.map(app => 
                app.id === id ? { ...app, status: action } : app
            ));
            if (detailApp?.id === id) {
                setDetailApp(prev => ({ ...prev, status: action }));
            }
            setOpenMenuId(null);
        } catch (err) { notify.error("Failed"); }
        finally { setActionLoading(false); }
    };

    const visibleApps = applications.filter(app => {
        const matchesSearch = app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              app.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const isVisibleStatus = app.status === 'pending' || app.status === 'hold';
        return matchesSearch && isVisibleStatus;
    });

    // Detail view
    if (detailApp) {
        const a = detailApp;
        const photoUrl = buildAssetUrl(a.photo_path);

        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 bg-white flex-wrap">
                    <button onClick={() => setDetailApp(null)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title="Back to list">
                        <ArrowLeft size={18} />
                    </button>
                    <span className="font-semibold text-sm text-gray-900 ml-1">Application Details</span>
                    <div className="flex-1" />
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${
                        a.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                        a.status === 'hold' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        a.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-red-50 text-red-700 border-red-200'
                    }`}>
                        {a.status}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => { setDetailApp(null); openApproveModal(a); }} disabled={a.status !== 'pending'} className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Approve
                        </button>
                        {a.status !== 'hold' && (
                            <button onClick={() => handleSingleAction(a.id, 'hold')} className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors">
                                Hold
                            </button>
                        )}
                        <button onClick={() => handleSingleAction(a.id, 'reject')} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                            Reject
                        </button>
                    </div>
                </div>

                <div className="p-3 md:p-6 space-y-4 md:space-y-8">
                    {/* Photo + Name Section */}
                    <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-6">
                        {photoUrl ? (
                            <img src={photoUrl} alt={a.full_name} className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-[#1F4E79] flex items-center justify-center text-white text-2xl font-bold">
                                {a.full_name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900">{a.full_name}</h1>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-500">
                                <span>{a.email}</span>
                                <span>{a.phone}</span>
                                {a.dob && <span>DOB: {a.dob}</span>}
                                {a.gender && <span>{a.gender}</span>}
                            </div>
                            <p className="text-sm text-[#1F4E79] font-medium mt-1.5">
                                Applied for: {a.course_title || a.course?.title || 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                        {/* Personal Information */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Personal Information</h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <InfoRow label="Full Name" value={a.full_name} />
                                <InfoRow label="Email" value={a.email} />
                                <InfoRow label="Phone" value={a.phone} />
                                {a.dob && <InfoRow label="Date of Birth" value={a.dob} />}
                                {a.gender && <InfoRow label="Gender" value={a.gender} />}
                                {a.nationality && <InfoRow label="Nationality" value={a.nationality} />}
                                {a.religion && <InfoRow label="Religion" value={a.religion} />}
                                {a.blood_group && <InfoRow label="Blood Group" value={a.blood_group} />}
                            </div>
                        </div>

                        {/* Parent Information */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Parent Information</h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase">Father</h4>
                                <InfoRow label="Name" value={a.father_name} />
                                {a.father_mobile && <InfoRow label="Mobile" value={a.father_mobile} />}
                                {a.father_email && <InfoRow label="Email" value={a.father_email} />}
                                {a.father_occupation && <InfoRow label="Occupation" value={a.father_occupation} />}
                                <div className="border-t border-gray-200 pt-3">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase">Mother</h4>
                                </div>
                                <InfoRow label="Name" value={a.mother_name} />
                                {a.mother_mobile && <InfoRow label="Mobile" value={a.mother_mobile} />}
                                {a.mother_email && <InfoRow label="Email" value={a.mother_email} />}
                                {a.mother_occupation && <InfoRow label="Occupation" value={a.mother_occupation} />}
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Address</h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                {a.address && <InfoRow label="Present Address" value={a.address} />}
                                {a.permanent_address && <InfoRow label="Permanent Address" value={a.permanent_address} />}
                            </div>
                        </div>

                        {/* Educational Background */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Educational Background</h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                {a.last_school && <InfoRow label="Last School" value={a.last_school} />}
                                {a.jsc_gpa && <InfoRow label="JSC GPA" value={a.jsc_gpa} />}
                                {a.ssc_gpa && <InfoRow label="SSC GPA" value={a.ssc_gpa} />}
                                {!a.last_school && !a.jsc_gpa && !a.ssc_gpa && (
                                    <p className="text-sm text-gray-400 italic">No educational information provided.</p>
                                )}
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Emergency Contact</h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                {a.emergency_name && <InfoRow label="Name" value={a.emergency_name} />}
                                {a.emergency_mobile && <InfoRow label="Mobile" value={a.emergency_mobile} />}
                                {a.emergency_relation && <InfoRow label="Relation" value={a.emergency_relation} />}
                                {!a.emergency_name && !a.emergency_mobile && !a.emergency_relation && (
                                    <p className="text-sm text-gray-400 italic">No emergency contact provided.</p>
                                )}
                            </div>
                        </div>

                        {/* Application Meta */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Application Info</h3>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <InfoRow label="Application ID" value={`#${a.id}`} />
                                <InfoRow label="Applied Course" value={a.course_title || a.course?.title || 'N/A'} />
                                <InfoRow label="Status" value={a.status} />
                                <InfoRow label="Submitted" value={new Date(a.created_at).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} />
                                {a.updated_at !== a.created_at && (
                                    <InfoRow label="Last Updated" value={new Date(a.updated_at).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 px-3 md:px-6 py-3 md:py-4 bg-gray-50 flex flex-col sm:flex-row items-center gap-2">
                    <button onClick={() => setDetailApp(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Back to List
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => { setDetailApp(null); openApproveModal(a); }} disabled={a.status !== 'pending'} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        Approve & Create Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mobile-card relative min-h-[500px]">
            
            {/* Header */}
            <div className="section-header">
              <div>
                <h1 className="text-lg md:text-xl font-bold text-[#1F4F78]">Admission Requests</h1>
                <p className="text-xs md:text-sm text-gray-500">{visibleApps.length} requests needing attention</p>
              </div>
              <div className="relative w-full sm:w-48">
                <input type="text" placeholder="Search..." 
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:border-[#1F4F78] text-sm focus:outline-none"
                  onChange={e => setSearchTerm(e.target.value)} />
                <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
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
              <>
                <div className="hidden md:flex absolute top-2 left-1/2 transform -translate-x-1/2 bg-[#1F4F78] text-white px-6 py-2.5 rounded-full shadow-2xl items-center gap-5 z-20 border-2 border-white">
                  <span className="text-sm font-bold">{selectedIds.length} Selected</span>
                  <div className="h-5 w-[1px] bg-white/40"></div>
                  <button onClick={() => handleBulkAction('approve')} className="text-xs font-bold hover:text-green-300 flex items-center gap-1 transition"><CheckCircle size={16}/> Approve</button>
                  <button onClick={() => handleBulkAction('hold')} className="text-xs font-bold hover:text-yellow-300 flex items-center gap-1 transition"><Clock size={16}/> Hold</button>
                  <button onClick={() => handleBulkAction('reject')} className="text-xs font-bold hover:text-red-300 flex items-center gap-1 transition"><XCircle size={16}/> Reject</button>
                </div>
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1F4F78] text-white px-4 py-3 shadow-2xl z-50 flex items-center gap-3">
                  <span className="text-sm font-bold flex-shrink-0">{selectedIds.length} selected</span>
                  <div className="flex gap-2 flex-1 justify-end">
                    <button onClick={() => handleBulkAction('approve')} className="text-xs font-bold px-3 py-1.5 bg-green-500 rounded-lg hover:bg-green-400">Approve</button>
                    <button onClick={() => handleBulkAction('hold')} className="text-xs font-bold px-3 py-1.5 bg-yellow-500 rounded-lg hover:bg-yellow-400">Hold</button>
                    <button onClick={() => handleBulkAction('reject')} className="text-xs font-bold px-3 py-1.5 bg-red-500 rounded-lg hover:bg-red-400">Reject</button>
                  </div>
                </div>
              </>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <div className="hidden md:block">
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
                            <tr key={app.id} className={`border-b border-gray-100 transition ${selectedIds.includes(app.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-3 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(app.id)}
                                        onChange={() => handleSelectOne(app.id)}
                                        className="cursor-pointer"
                                    />
                                </td>
                                
                                <td className="p-3">
                                    <button onClick={() => setDetailApp(app)} className="font-semibold text-[#1F4F78] hover:underline text-left">
                                        {app.full_name}
                                    </button>
                                    <div className="md:hidden text-xs text-gray-400 mt-1">
                                        {app.course_title || app.course?.title} <br/> {app.phone}
                                    </div>
                                </td>

                                <td className="p-3 hidden md:table-cell text-gray-600 font-medium">{app.course_title || app.course?.title || 'N/A'}</td>
                                
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
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => setDetailApp(app)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-[#1F4F78] transition-colors" title="View Details">
                                            <Eye size={15} />
                                        </button>
                                        <div className="relative">
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
                                                <div className="absolute right-0 top-0 mt-6 w-32 bg-white border border-gray-200 shadow-lg rounded z-50">
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); openApproveModal(app); }} className="w-full px-4 py-2 text-xs text-green-600 hover:bg-green-50 flex items-center gap-2 border-b">
                                                        <Check size={14}/> Approve
                                                    </button>
                                                    {app.status !== 'hold' && (
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleSingleAction(app.id, 'hold'); }} className="w-full px-4 py-2 text-xs text-yellow-600 hover:bg-yellow-50 flex items-center gap-2 border-b">
                                                            <Clock size={14}/> Hold
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleSingleAction(app.id, 'reject'); }} className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                        <X size={14}/> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && visibleApps.length === 0 && (
                            <tr><td colSpan="6" className="p-10 text-center text-gray-400">No pending/hold requests.</td></tr>
                        )}
                    </tbody>
                </table>
              </div>
            {!loading && visibleApps.map(app => (
              <div key={app.id} className="md:hidden bg-white rounded-lg border border-gray-200 p-3 mb-2 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <button onClick={() => { if (detailApp) setDetailApp(null); setDetailApp(app); }} className="font-semibold text-[#1F4F78] text-sm text-left hover:underline">{app.full_name}</button>
                    <p className="text-xs text-gray-500 mt-0.5">{app.course_title || app.course?.title}</p>
                    <p className="text-xs text-gray-400">{app.phone} &bull; {app.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0 ml-2 ${app.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : app.status === 'hold' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}`}>{app.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => { if (detailApp) setDetailApp(null); setDetailApp(app); }} className="flex-1 text-xs py-1.5 bg-gray-100 rounded text-center hover:bg-gray-200"><Eye size={14} className="inline mr-1"/>View</button>
                  <button onClick={() => openApproveModal(app)} className="flex-1 text-xs py-1.5 bg-green-50 text-green-700 rounded text-center hover:bg-green-100"><Check size={14} className="inline mr-1"/>Approve</button>
                  <button onClick={() => handleSingleAction(app.id, 'reject')} className="flex-1 text-xs py-1.5 bg-red-50 text-red-700 rounded text-center hover:bg-red-100"><X size={14} className="inline mr-1"/>Reject</button>
                </div>
              </div>
            ))}
            </div>

            {/* Approval Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 responsive-modal">
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

function InfoRow({ label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-gray-400 w-28 flex-shrink-0">{label}</span>
            <span className="text-sm text-gray-800">{value}</span>
        </div>
    );
}
