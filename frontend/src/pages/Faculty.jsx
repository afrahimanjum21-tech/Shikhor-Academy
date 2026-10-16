import { useEffect, useState } from "react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { User, Search, Star, BookOpen, Award, Briefcase, GraduationCap, ArrowRight, Users2, SlidersHorizontal, X, Mail, Phone, BadgeCheck, ExternalLink, FlaskConical } from "lucide-react";
import usePageMeta from "../hooks/usePageMeta";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";

import logger from '../services/logger';

// Boxed-select chevron (slate) reused by all three filter dropdowns.
const SELECT_CHEVRON =
    "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat";
const selectCls =
    `h-11 min-w-[140px] flex-1 appearance-none rounded-xl border border-slate-200 bg-paper px-3.5 pr-9 text-sm text-slate-600 outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15 sm:w-44 sm:flex-none ${SELECT_CHEVRON}`;

// Brand-colored social SVG icons
const SocialIcons = {
    facebook: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    linkedin: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>,
    youtube: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    twitter: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    instagram: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    whatsapp: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>,
    website: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/><path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/></svg>,
    github: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>,
};

const SocialColors = {
    facebook: 'bg-[#1877F2] hover:bg-[#0d65d9]',
    linkedin: 'bg-[#0A66C2] hover:bg-[#084f95]',
    youtube: 'bg-[#FF0000] hover:bg-[#cc0000]',
    twitter: 'bg-black hover:bg-gray-800',
    instagram: 'bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90',
    whatsapp: 'bg-[#25D366] hover:bg-[#1da851]',
    github: 'bg-gray-800 hover:bg-gray-900',
    website: 'bg-[#1F4E79] hover:bg-[#1a3d66]',
};

export default function Faculty() {
    usePageMeta({
        title: "Our Faculty — Shikhor Academy",
        description: "Meet the experienced teachers of Shikhor Academy who guide students toward academic excellence in HSC and SSC.",
        path: "/faculty",
    });
    const [faculty, setFaculty] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const [deptRes, subjRes, catRes] = await Promise.all([
                    api.get('/public/faculty/departments'),
                    api.get('/public/faculty/subjects'),
                    api.get('/public/faculty/categories'),
                ]);
                setDepartments(deptRes.data);
                setSubjects(subjRes.data);
                setCategories(catRes.data);
            } catch (error) {
                logger.error('Failed to fetch filters:', error);
            }
        })();
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchTerm) params.append('q', searchTerm);
                if (filterDepartment) params.append('department', filterDepartment);
                if (filterSubject) params.append('subject_id', filterSubject);
                if (filterCategory) params.append('category', filterCategory);
                params.append('page', '1');
                params.append('limit', '12');
                const endpoint = searchTerm ? '/public/faculty/search' : '/public/faculty';
                const { data } = await api.get(`${endpoint}?${params}`);
                if (active) {
                    const list = Array.isArray(data) ? data : (data.data || []);
                    setFaculty(list);
                    setTotal(data.total ?? list.length);
                    setPage(1);
                }
            } catch (error) {
                logger.error('Failed to fetch faculty:', error);
                if (active) setFaculty([]);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [searchTerm, filterDepartment, filterSubject, filterCategory]);

    const loadMore = async () => {
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('q', searchTerm);
            if (filterDepartment) params.append('department', filterDepartment);
            if (filterSubject) params.append('subject_id', filterSubject);
            if (filterCategory) params.append('category', filterCategory);
            params.append('page', String(page + 1));
            params.append('limit', '12');
            const endpoint = searchTerm ? '/public/faculty/search' : '/public/faculty';
            const { data } = await api.get(`${endpoint}?${params}`);
            const list = Array.isArray(data) ? data : (data.data || []);
            setFaculty(prev => [...prev, ...list]);
            setPage(page + 1);
        } catch (error) {
            logger.error('Failed to load more faculty:', error);
        }
    };

    // §D/P: DEAD CODE — superseded by the dedicated detail PAGE. Both the
    // faculty card (navigate(`/faculty/:slug`)) and its button go to the full
    // profile page, which is the confirmed live product behaviour; this
    // handler + the "Faculty Details Modal" below are never invoked. Left in
    // place (not deleted) and documented rather than re-wired, to avoid
    // changing the current UX / inventing new modal behaviour. Safe to remove
    // in a dedicated cleanup once product confirms the modal is retired.
    const handleViewDetails = (fac) => {
        setSelectedFaculty(fac);
        setShowModal(true);
    };

    return (
        <div className="min-h-screen font-sans">
            {/* Page Header — navy band (segment colour) */}
            <section className="relative overflow-hidden bg-ink text-white">
                <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                <div className="relative mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:py-12">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                        <p className="mb-1 font-bangla text-sm text-brass-100">আমাদের শিক্ষকমণ্ডলী</p>
                        <h1 className="font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">Meet our expert faculty</h1>
                        <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                            Dedicated mentors with proven expertise, committed to guiding you toward academic excellence.
                        </p>
                    </motion.div>
                </div>
            </section>

            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
                {/* Search & Filters */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-8 rounded-2xl border border-slate-200/80 bg-paper p-4 shadow-card sm:p-5">
                    <div className="flex flex-col gap-3">
                        {/* Search Bar — full width */}
                        <div className="relative w-full">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                            <input type="text" placeholder="Search faculty..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                aria-label="Search faculty"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-paper pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-ink focus:ring-2 focus:ring-ink/15" />
                        </div>
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                                aria-label="Filter by category" className={selectCls}>
                                    <option value="">All Categories</option>
                                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}
                                aria-label="Filter by department" className={selectCls}>
                                    <option value="">All Departments</option>
                                    {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                                </select>
                            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                                aria-label="Filter by subject" className={selectCls}>
                                    <option value="">All Subjects</option>
                                    {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                                </select>
                            <button onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterDepartment(''); setFilterSubject(''); }}
                                className="h-11 whitespace-nowrap rounded-xl px-4 text-xs font-semibold text-slate-500 transition-colors hover:text-ink">
                                Reset filters
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Results header */}
                {!loading && faculty.length > 0 && (
                    <div className="mb-6 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-ink">{total}</span> faculty member{total !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}

                {/* Faculty Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex animate-pulse flex-col items-center rounded-2xl border border-slate-200/80 bg-paper p-4 shadow-card sm:p-5">
                                <div className="mb-4 h-20 w-20 rounded-full bg-slate-200 sm:h-24 sm:w-24 md:h-28 md:w-28" />
                                <div className="h-4 w-24 rounded bg-slate-200" />
                                <div className="mt-2 h-3 w-20 rounded bg-slate-200" />
                                <div className="mt-3 h-3 w-16 rounded bg-slate-200" />
                            </div>
                        ))}
                    </div>
                ) : faculty.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-paper text-slate-400">
                            <User size={32} aria-hidden="true" />
                        </div>
                        <h3 className="font-display text-xl font-semibold text-ink">No faculty members found</h3>
                        <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                        {faculty.map((fac) => (
                            <Link key={fac.id} to={`/faculty/${fac.slug}`}
                                className="group flex flex-col items-center rounded-2xl border border-slate-200/80 bg-paper p-4 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brass/40 hover:shadow-card-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:p-5">
                                {/* Portrait */}
                                <div className="relative mb-4">
                                    <div className="h-20 w-20 overflow-hidden rounded-full bg-paper ring-2 ring-brass-100 sm:h-24 sm:w-24 md:h-28 md:w-28">
                                        {fac.profile_photo_path ? (
                                            <img src={buildAssetUrl(fac.profile_photo_path)} alt={fac.full_name} loading="lazy"
                                                onError={(e) => { e.target.onerror = null; e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E`; e.target.classList.add('p-5'); }}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-ink/5">
                                                <User size={26} className="text-ink/30" aria-hidden="true" />
                                            </div>
                                        )}
                                    </div>
                                    {fac.is_featured && (
                                        <span className="absolute -bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brass px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm">
                                            <Star size={9} fill="currentColor" aria-hidden="true" /> Featured
                                        </span>
                                    )}
                                </div>
                                {/* Content */}
                                <h3 className="font-display text-base font-semibold leading-tight text-ink transition-colors group-hover:text-primary sm:text-lg">
                                    {fac.full_name}
                                </h3>
                                <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{fac.designation}</p>
                                {fac.department?.name && (
                                    <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-[11px]">{fac.department.name}</p>
                                )}
                                {fac.specialization && (
                                    <p className="mt-2 hidden line-clamp-1 text-xs text-slate-500 sm:block">{fac.specialization}</p>
                                )}
                                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brass-600 transition-all group-hover:gap-2">
                                    View profile <ArrowRight size={13} aria-hidden="true" />
                                </span>
                            </Link>
                        ))}
                    </div>
                )}

                {!loading && faculty.length > 0 && faculty.length < total && (
                    <div className="mt-10 flex justify-center">
                        <button onClick={loadMore}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-ink px-6 py-2.5 text-sm font-semibold text-ink transition-all duration-300 hover:bg-ink hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
                            Load more
                        </button>
                    </div>
                )}
            </div>

            {/* Faculty Details Modal */}
            {showModal && selectedFaculty && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 responsive-modal">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-paper rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-paper border-b border-gray-200 p-6 flex items-center justify-between z-10">
                            <h2 className="text-2xl font-bold text-gray-800">Faculty Details</h2>
                            <button 
                                onClick={() => { setShowModal(false); setSelectedFaculty(null); }}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                            {/* Profile Header */}
                            <div className="flex flex-col md:flex-row gap-6 mb-8">
                                <div className="flex-shrink-0">
                                    <div className="h-32 w-32 rounded-2xl shadow-lg overflow-hidden border-4 border-white ring-1 ring-gray-100">
                                        {selectedFaculty.profile_photo_path ? (
                                            <img src={buildAssetUrl(selectedFaculty.profile_photo_path)} alt={selectedFaculty.full_name}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                                                className="w-full h-full object-cover" />
                                        ) : null}
                                        <div className="w-full h-full bg-gradient-to-br from-[#1F4E79] to-[#2E6BA8] flex items-center justify-center" style={{ display: selectedFaculty.profile_photo_path ? 'none' : 'flex' }}>
                                            <User size={64} className="text-white/50" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-800">{selectedFaculty.full_name}</h3>
                                    <p className="text-[#1F4E79] font-semibold text-lg">{selectedFaculty.designation}</p>
                                    {selectedFaculty.department?.name && <p className="text-gray-500 mt-1">{selectedFaculty.department.name}</p>}
                                    {selectedFaculty.category?.name && <p className="text-sm text-gray-400 mt-1">Category: {selectedFaculty.category.name}</p>}
                                    
                                    <div className="flex flex-wrap gap-4 mt-4 text-sm">
                                        {selectedFaculty.employee_id && (
                                            <span className="flex items-center gap-1.5 text-gray-600"><BadgeCheck size={15} className="text-[#1F4E79]" /> ID: {selectedFaculty.employee_id}</span>
                                        )}
                                        {selectedFaculty.teaching_experience > 0 && (
                                            <span className="flex items-center gap-1.5 text-gray-600"><Briefcase size={15} className="text-[#1F4E79]" /> {selectedFaculty.teaching_experience}+ years</span>
                                        )}
                                        {selectedFaculty.official_email && (
                                            <a href={`mailto:${selectedFaculty.official_email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-[#1F4E79]"><Mail size={15} className="text-[#1F4E79]" /> {selectedFaculty.official_email}</a>
                                        )}
                                        {selectedFaculty.official_phone && (
                                            <a href={`tel:${selectedFaculty.official_phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-[#1F4E79]"><Phone size={15} className="text-[#1F4E79]" /> {selectedFaculty.official_phone}</a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Biography */}
                            {selectedFaculty.biography && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><User size={18} className="text-[#1F4E79]" /> Biography</h4>
                                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedFaculty.biography}</p>
                                </div>
                            )}

                            {/* Expertise Section */}
                            {(selectedFaculty.specialization || selectedFaculty.qualification || selectedFaculty.research) && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><BookOpen size={18} className="text-[#1F4E79]" /> Expertise</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedFaculty.specialization && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Specialization</p>
                                                <p className="text-gray-700 text-sm">{selectedFaculty.specialization}</p>
                                            </div>
                                        )}
                                        {selectedFaculty.qualification && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Qualification</p>
                                                <p className="text-gray-700 text-sm">{selectedFaculty.qualification}</p>
                                            </div>
                                        )}
                                        {selectedFaculty.research && (
                                            <div className="md:col-span-2">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Research & Interests</p>
                                                <p className="text-gray-700 text-sm">{selectedFaculty.research}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Educational Qualifications */}
                            {selectedFaculty.qualifications?.length > 0 && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><GraduationCap size={18} className="text-[#1F4E79]" /> Educational Qualifications</h4>
                                    <div className="space-y-2">
                                        {selectedFaculty.qualifications.map((qual, idx) => (
                                            <div key={idx} className="flex gap-3 p-3 bg-paper rounded-lg border border-gray-100">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1F4E79]/10 flex items-center justify-center"><GraduationCap size={16} className="text-[#1F4E79]" /></div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800 text-sm">{qual.degree}{qual.field_of_study ? ` in ${qual.field_of_study}` : ''}</p>
                                                    <p className="text-gray-600 text-xs">{qual.institution}</p>
                                                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                                        {qual.passing_year && <span>Year: {qual.passing_year}</span>}
                                                        {qual.grade && <span>Grade: {qual.grade}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Achievements */}
                            {selectedFaculty.achievements?.length > 0 && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Award size={18} className="text-[#1F4E79]" /> Achievements</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {selectedFaculty.achievements.map((ach, idx) => (
                                            <div key={idx} className="p-3 bg-paper rounded-lg border border-gray-100">
                                                <p className="font-semibold text-gray-800 text-sm">{ach.title}</p>
                                                {ach.description && <p className="text-gray-600 text-xs mt-1">{ach.description}</p>}
                                                <div className="flex items-center gap-2 mt-2">
                                                    {ach.date && <span className="text-xs text-gray-500">{ach.date}</span>}
                                                    {ach.category && <span className="px-2 py-0.5 bg-[#1F4E79]/10 text-[#1F4E79] rounded text-xs">{ach.category}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Certifications */}
                            {selectedFaculty.certifications?.length > 0 && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Award size={18} className="text-[#1F4E79]" /> Certifications</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {selectedFaculty.certifications.map((cert, idx) => (
                                            <div key={idx} className="p-3 bg-paper rounded-lg border border-gray-100">
                                                <p className="font-semibold text-gray-800 text-sm">{cert.name}</p>
                                                <p className="text-gray-600 text-xs">{cert.issuing_organization}</p>
                                                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                                    {cert.issue_date && <span>Issued: {cert.issue_date}</span>}
                                                    {cert.expiry_date && <span>Expires: {cert.expiry_date}</span>}
                                                </div>
                                                {cert.certificate_url && (
                                                    <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[#1F4E79] hover:underline text-xs font-medium">
                                                        View Certificate <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Subjects */}
                            {selectedFaculty.subjects?.length > 0 && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><BookOpen size={18} className="text-[#1F4E79]" /> Subjects</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFaculty.subjects.map((subject) => (
                                            <span key={subject.id} className="px-3 py-1.5 bg-[#1F4E79]/10 text-[#1F4E79] rounded-lg text-sm font-medium">{subject.name}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Assigned Batches */}
                            {selectedFaculty.batches?.length > 0 && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Users2 size={18} className="text-[#1F4E79]" /> Assigned Batches</h4>
                                    <div className="space-y-2">
                                        {selectedFaculty.batches.map((batch, idx) => (
                                            <div key={idx} className="p-3 bg-paper rounded-lg border border-gray-100">
                                                <p className="font-medium text-gray-800 text-sm">{batch.batch?.name || batch.name || 'Batch'}</p>
                                                {batch.subject && <p className="text-xs text-[#1F4E79]">Subject: {batch.subject}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Social Links */}
                            {selectedFaculty.social_links?.length > 0 && (
                                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Users2 size={18} className="text-[#1F4E79]" /> Social Links</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFaculty.social_links.map((link, idx) => {
                                            const Icon = SocialIcons[link.platform];
                                            const colorClass = SocialColors[link.platform] || 'bg-[#1F4E79] hover:bg-[#1a3d66]';
                                            return (
                                                <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 ${colorClass}`}>
                                                    {Icon && <Icon className="w-4 h-4" />}
                                                    <span className="capitalize">{link.platform}</span>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* View Full Profile Button */}
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => { setShowModal(false); setSelectedFaculty(null); navigate(`/faculty/${selectedFaculty.slug}`); }}
                                    className="flex items-center gap-2 px-6 py-3 bg-[#1F4E79] text-white rounded-xl font-semibold hover:bg-[#1a3d66] transition-colors"
                                >
                                    View Full Profile <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
