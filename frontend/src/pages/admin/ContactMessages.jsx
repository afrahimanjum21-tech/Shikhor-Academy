import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationCounts } from "../../context/NotificationContext";
import { useConfirm } from "../../components/common/ConfirmDialog";

export default function ContactMessages() {
    const confirm = useConfirm();
    const { markViewed } = useNotificationCounts();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [view, setView] = useState("all");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => { markViewed("messages"); }, []);

    const fetch = useCallback((p = page) => {
        setLoading(true);
        const params = { page: p, per_page: 50 };
        if (view === "unread") params.unread = "true";
        if (view === "trash") {
            api.get("/admin/contact-messages/trashed", { params })
                .then(({ data }) => {
                    setMessages(data.data || []);
                    setLastPage(data.last_page || 1);
                    setTotal(data.total || 0);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
            return;
        }
        api.get("/admin/contact-messages", { params })
            .then(({ data }) => {
                setMessages(data.data || []);
                setLastPage(data.last_page || 1);
                setTotal(data.total || 0);
            })
            .catch(() => {})
            .finally(() => setLoading(false));

        api.get("/admin/contact-messages", { params: { unread: "true", per_page: 1 } })
            .then(({ data }) => setUnreadCount(data.total || 0))
            .catch(() => {});
    }, [view, page]);

    useEffect(() => { fetch(); }, [view]);

    useEffect(() => { fetch(page); }, [page]);

    const handleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selected.size === messages.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(messages.map(m => m.id)));
        }
    };

    const handleOpen = (msg) => {
        if (!msg.is_read) {
            api.post(`/admin/contact-messages/${msg.id}/read`).then(() => {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }).catch(() => {});
        }
        setDetail(msg);
    };

    const [detail, setDetail] = useState(null);
    const [showFullDetails, setShowFullDetails] = useState(false);

    const handleMarkRead = () => {
        if (selected.size === 0) return;
        const ids = [...selected];
        Promise.all(ids.map(id => api.post(`/admin/contact-messages/${id}/read`)))
            .then(() => {
                setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, is_read: true } : m));
                setUnreadCount(prev => Math.max(0, prev - ids.length));
                setSelected(new Set());
            })
            .catch(() => {});
    };

    const handleDeleteSelected = async () => {
        const ids = [...selected];
        if (ids.length === 0) return;
        const ok = await confirm({ title: "Delete Selected Messages?", message: `Delete ${ids.length} selected message(s)? They will move to the trash.`, confirmText: "Delete", variant: "destructive" }); if (!ok) return;
        await Promise.all(ids.map(id => api.delete(`/admin/contact-messages/${id}`)))
            .then(() => {
                setMessages(prev => prev.filter(m => !ids.includes(m.id)));
                setTotal(prev => prev - ids.length);
                setSelected(new Set());
                if (detail && ids.includes(detail.id)) setDetail(null);
            })
            .catch(() => {});
    };

    const handleDeleteAll = async () => {
        const count = messages.length;
        if (count === 0) return;
        const ok = await confirm({ title: "Delete All Messages?", message: `Delete all ${count} message(s)? This cannot be undone.`, confirmText: "Delete", variant: "destructive" }); if (!ok) return;
        const ids = messages.map(m => m.id);
        await Promise.all(ids.map(id => api.delete(`/admin/contact-messages/${id}`)))
            .then(() => {
                setMessages([]);
                setTotal(0);
                setSelected(new Set());
                setDetail(null);
            })
            .catch(() => {});
    };

    const handleMarkAllRead = () => {
        api.post("/admin/contact-messages/read-all").then(() => {
            setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
            setUnreadCount(0);
        }).catch(() => {});
    };

    const handleDeleteSingle = async (id) => {
        const ok = await confirm({ title: "Delete Message?", message: "Delete this message?", confirmText: "Delete", variant: "destructive" }); if (!ok) return;
        await api.delete(`/admin/contact-messages/${id}`).then(() => {
            setMessages(prev => prev.filter(m => m.id !== id));
            setTotal(prev => prev - 1);
            if (detail?.id === id) setDetail(null);
        }).catch(() => {});
    };

    const handleRestore = (id) => {
        api.post(`/admin/contact-messages/${id}/restore`).then(() => {
            setMessages(prev => prev.filter(m => m.id !== id));
            setTotal(prev => prev - 1);
            if (detail?.id === id) setDetail(null);
        }).catch(() => {});
    };

    const handleForceDeleteSingle = async (id) => {
        const ok = await confirm({ title: "Permanently Delete?", message: "Permanently delete this message? This cannot be undone.", confirmText: "Delete", variant: "destructive" }); if (!ok) return;
        await api.delete(`/admin/contact-messages/${id}/force`).then(() => {
            setMessages(prev => prev.filter(m => m.id !== id));
            setTotal(prev => prev - 1);
            if (detail?.id === id) setDetail(null);
        }).catch(() => {});
    };

    const handleEmptyTrash = async () => {
        const count = messages.length;
        if (count === 0) return;
        const ok = await confirm({ title: "Empty Trash?", message: `Permanently delete all ${count} trashed message(s)? This cannot be undone.`, confirmText: "Delete", variant: "destructive" }); if (!ok) return;
        const ids = messages.map(m => m.id);
        await Promise.all(ids.map(id => api.delete(`/admin/contact-messages/${id}/force`)))
            .then(() => {
                setMessages([]);
                setTotal(0);
                setSelected(new Set());
                setDetail(null);
            })
            .catch(() => {});
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = (now - d) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
        if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const snippet = (text, len = 80) => {
        if (!text) return "";
        return text.length > len ? text.slice(0, len) + "..." : text;
    };

    const toggleFilter = (v) => {
        setView(v);
        setPage(1);
        setSelected(new Set());
        setDetail(null);
    };

    if (detail) {
        const msg = detail;
        const msgIds = messages.map(m => m.id);
        const currentIdx = msgIds.indexOf(msg.id);
        const prevMsg = currentIdx > 0 ? messages[currentIdx - 1] : null;
        const nextMsg = currentIdx < messages.length - 1 ? messages[currentIdx + 1] : null;
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Gmail-style toolbar */}
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-white">
                    <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title="Back to inbox">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div className="w-px h-5 bg-gray-200 mx-1" />
                    <button onClick={() => prevMsg && handleOpen(prevMsg)} disabled={!prevMsg} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Older">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    <button onClick={() => nextMsg && handleOpen(nextMsg)} disabled={!nextMsg} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Newer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => { api.post(`/admin/contact-messages/${msg.id}/read`).then(() => { setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m)); }).catch(() => {}); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title={msg.is_read ? "Mark as read" : "Mark as read"}>
                        {msg.is_read ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 12 8 19 23 4"/><path d="M11 12l5 5 7-7"/></svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 12 8 19 23 4"/><path d="M1 12l7 7L23 4"/></svg>
                        )}
                    </button>
                    <button onClick={() => handleDeleteSingle(msg.id)} className="p-2 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                    <a href={`mailto:${msg.email}?subject=Re: ${msg.subject}`} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title="Reply in email client">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </a>
                </div>

                {/* Subject */}
                <div className="px-5 pt-5 pb-2">
                    <h1 className="text-xl font-semibold text-gray-900 leading-tight">{msg.subject}</h1>
                </div>

                {/* Gmail-style sender card */}
                <div className="px-5 pb-2">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-0.5">
                            {msg.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-900">{msg.name}</span>
                                <span className="text-sm text-gray-500 hidden sm:inline">&lt;{msg.email}&gt;</span>
                                <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                                    {new Date(msg.createdAt).toLocaleString("en-US", {
                                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit", year: msg.createdAt?.includes(new Date().getFullYear().toString()) ? undefined : "numeric"
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                <span>to me</span>
                                {msg.phone && <span className="text-gray-300">|</span>}
                                {msg.phone && <span>{msg.phone}</span>}
                                <button onClick={() => setShowFullDetails(!showFullDetails)} className="ml-1 text-gray-400 hover:text-gray-600 transition-colors">
                                    {showFullDetails ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                    ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                    )}
                                </button>
                            </div>
                            {showFullDetails && (
                                <div className="mt-2 text-xs text-gray-500 space-y-0.5 bg-gray-50 rounded-lg p-3">
                                    <div><span className="text-gray-400 w-20 inline-block">From:</span> {msg.name} &lt;{msg.email}&gt;</div>
                                    {msg.phone && <div><span className="text-gray-400 w-20 inline-block">Phone:</span> {msg.phone}</div>}
                                    <div><span className="text-gray-400 w-20 inline-block">Date:</span> {new Date(msg.createdAt).toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                                    <div><span className="text-gray-400 w-20 inline-block">Subject:</span> {msg.subject}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reply button row */}
                <div className="px-5 py-1 border-b border-gray-100">
                    <div className="flex items-center gap-1 pb-2 ml-[52px]">
                        <a href={`mailto:${msg.email}?subject=Re: ${msg.subject}`} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            Reply
                        </a>
                        <a href={`mailto:${msg.email}?subject=Re: ${msg.subject}`} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            Reply All
                        </a>
                        <a href={`mailto:?to=${msg.email}&subject=Fw: ${msg.subject}`} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            Forward
                        </a>
                    </div>
                </div>

                {/* Message body */}
                <div className="px-5 py-5">
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                </div>

                {/* Bottom reply */}
                <div className="px-5 pb-6 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 ml-[52px]">
                        <a href={`mailto:${msg.email}?subject=Re: ${msg.subject}`} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#1F4E79] rounded-lg hover:bg-[#1F4E79]/90 transition-colors shadow-sm">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            Reply
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="section-header">
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-primary">Messages</h1>
                    <p className="text-xs md:text-sm text-gray-500">View and manage contact form submissions</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-2 md:px-3 py-2 border-b border-gray-200 bg-white sticky top-0 z-10 overflow-x-auto scrollbar-hide">
                <label className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full hover:bg-gray-100 cursor-pointer transition-colors shrink-0">
                    <input type="checkbox" checked={messages.length > 0 && selected.size === messages.length} onChange={handleSelectAll} className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-gray-300 text-[#1F4E79] focus:ring-[#1F4E79]" />
                </label>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <button onClick={handleMarkRead} disabled={selected.size === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap shrink-0" title="Mark selected messages as read">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 12 8 19 23 4"/><path d="M1 12l7 7L23 4"/></svg>
                    <span className="hidden sm:inline">Mark as read</span>
                </button>
                <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 whitespace-nowrap shrink-0" title="Mark all as read">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 12 8 19 23 4"/><path d="M9 12l5 5 9-9"/></svg>
                    <span className="hidden sm:inline">Mark all read</span>
                </button>
                {view === "trash" ? (
                    <>
                        <button onClick={handleEmptyTrash} disabled={messages.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap shrink-0" title="Empty trash">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            <span className="hidden sm:inline">Empty trash</span>
                        </button>
                        <button onClick={() => toggleFilter("all")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 whitespace-nowrap shrink-0" title="Back to inbox">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            <span className="hidden sm:inline">Back to inbox</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => toggleFilter("trash")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 whitespace-nowrap shrink-0" title="Trash">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            <span className="hidden sm:inline">Trash</span>
                        </button>
                        <button onClick={handleDeleteSelected} disabled={selected.size === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap shrink-0" title="Delete selected messages">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            <span className="hidden sm:inline">Delete selected</span>
                        </button>
                        <button onClick={handleDeleteAll} disabled={messages.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap shrink-0" title="Delete all messages">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            <span className="hidden sm:inline">Delete all</span>
                        </button>
                    </>
                )}
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <button onClick={() => { setPage(1); fetch(1); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 whitespace-nowrap shrink-0" title="Refresh">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    <span className="hidden sm:inline">Refresh</span>
                </button>

                <div className="flex-1" />

                <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                    <button onClick={() => toggleFilter("all")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all active:scale-95 ${view === "all" ? "bg-[#1F4E79] text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}>All</button>
                    <button onClick={() => toggleFilter("unread")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all active:scale-95 ${view === "unread" ? "bg-[#1F4E79] text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}>Unread</button>
                    <button onClick={() => toggleFilter("trash")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all active:scale-95 ${view === "trash" ? "bg-[#1F4E79] text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}>Trash</button>
                </div>

                <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                    {unreadCount} unread
                </span>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1F4E79]" />
                </div>
            ) : messages.length === 0 ? (
                <div className="text-center py-24">
                    {view === "trash" ? (
                        <>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            <p className="text-gray-500 font-medium">Trash is empty</p>
                            <p className="text-xs text-gray-400 mt-1">Messages are permanently deleted after 30 days.</p>
                        </>
                    ) : (
                        <>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            <p className="text-gray-500 font-medium">No messages yet</p>
                            <p className="text-xs text-gray-400 mt-1">Messages from the contact form will appear here.</p>
                        </>
                    )}
                </div>
            ) : (
                <div>
                    {/* Desktop view */}
                    <div className="hidden md:block">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.01 }}
                            className={`flex items-center gap-0 px-3 py-0 border-b border-gray-100 group cursor-pointer transition-colors ${
                                selected.has(msg.id)
                                    ? "bg-[#C2DBFF] hover:bg-[#C2DBFF]"
                                    : msg.is_read
                                        ? "bg-white hover:bg-gray-50"
                                        : "bg-[#F2F6FC] hover:bg-[#E9F1FB]"
                            }`}
                            style={{ borderBottomColor: "#F3F4F6" }}
                        >
                            <label className="flex items-center justify-center w-9 h-11 rounded-full hover:bg-gray-100 cursor-pointer flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selected.has(msg.id)} onChange={() => handleSelect(msg.id)} className="w-4 h-4 rounded border-gray-300 text-[#1F4E79] focus:ring-[#1F4E79]" />
                            </label>
                            <div className={`flex items-center justify-center w-9 h-11 flex-shrink-0 ${!msg.is_read ? "opacity-0 group-hover:opacity-100" : "opacity-100"} transition-opacity`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </div>
                            <div className="flex items-center flex-1 min-w-0 gap-4 py-2.5" onClick={() => handleOpen(msg)}>
                                <span className={`text-sm min-w-[160px] max-w-[200px] truncate flex-shrink-0 ${msg.is_read ? "text-gray-600" : "text-gray-900 font-semibold"}`}>
                                    {msg.name}
                                </span>
                                <span className={`text-sm truncate flex-1 ${msg.is_read ? "text-gray-600" : "text-gray-900 font-semibold"}`}>
                                    {msg.subject}
                                    <span className={`ml-2 font-normal hidden sm:inline ${msg.is_read ? "text-gray-400" : "text-gray-500"}`}>— {snippet(msg.message, 80)}</span>
                                </span>
                                <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 ml-auto">{formatDate(view === "trash" ? msg.deletedAt : msg.createdAt)}</span>
                            </div>
                            {view === "trash" ? (
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); handleRestore(msg.id); }} className="p-1 rounded-full hover:bg-green-50 text-gray-300 hover:text-green-500 transition-all" title="Restore">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleForceDeleteSingle(msg.id); }} className="p-1 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all" title="Delete permanently">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                    </button>
                                </div>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSingle(msg.id); }} className="p-1 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 lg:opacity-100 lg:group-hover:opacity-100 transition-all flex-shrink-0" title="Delete">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                </button>
                            )}
                        </motion.div>
                    ))}
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-1.5 px-2 py-2">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.01 }}
                            className={`rounded-lg border border-gray-200 p-3 shadow-sm ${
                                selected.has(msg.id)
                                    ? "bg-[#C2DBFF] border-l-4 border-l-[#1F4E79]"
                                    : msg.is_read
                                        ? "bg-white"
                                        : "bg-[#F2F6FC] border-l-4 border-l-[#1F4E79]"
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <label className="flex items-center justify-center w-7 h-7 shrink-0 mt-0.5 rounded hover:bg-gray-100 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                    <input type="checkbox" checked={selected.has(msg.id)} onChange={() => handleSelect(msg.id)} className="w-3.5 h-3.5 rounded border-gray-300 text-[#1F4E79] focus:ring-[#1F4E79]" />
                                </label>
                                <div className="flex-1 min-w-0" onClick={() => handleOpen(msg)}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-sm truncate ${msg.is_read ? "text-gray-700" : "text-gray-900 font-bold"}`}>
                                            {!msg.is_read && <span className="w-2 h-2 rounded-full bg-[#1F4E79] inline-block mr-1.5" />}
                                            {msg.name}
                                        </span>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(view === "trash" ? msg.deletedAt : msg.createdAt)}</span>
                                    </div>
                                    <p className={`text-xs mt-0.5 truncate ${msg.is_read ? "text-gray-500" : "text-gray-800 font-semibold"}`}>{msg.subject}</p>
                                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{snippet(msg.message, 60)}</p>
                                </div>
                                <div className="flex gap-1 shrink-0 mt-0.5">
                                    {view === "trash" ? (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); handleRestore(msg.id); }} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-500 transition-all" title="Restore">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleForceDeleteSingle(msg.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all" title="Delete permanently">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSingle(msg.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all" title="Delete">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    </div>

                    {/* Pagination */}
                    {lastPage > 1 && (
                        <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-100">
                            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            </button>
                            {Array.from({ length: Math.min(lastPage, 7) }, (_, i) => {
                                let p;
                                if (lastPage <= 7) p = i + 1;
                                else if (page <= 4) p = i + 1;
                                else if (page >= lastPage - 3) p = lastPage - 6 + i;
                                else p = page - 3 + i;
                                return (
                                    <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${p === page ? "bg-[#1F4E79] text-white" : "text-gray-500 hover:bg-gray-100"}`}>{p}</button>
                                );
                            })}
                            <button disabled={page >= lastPage} onClick={() => setPage(p => Math.min(lastPage, p + 1))} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                            <span className="text-xs text-gray-400 ml-2">{total} {view === "trash" ? "deleted" : "total"}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
        </div>
    );
}
