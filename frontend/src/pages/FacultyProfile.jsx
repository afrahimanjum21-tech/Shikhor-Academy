import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Phone, Mail, MapPin, GraduationCap, Award, Briefcase,
  BadgeCheck, Users, BookOpen, Layers, ExternalLink, Clock, Globe,
} from "lucide-react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import logger from '../services/logger';

export default function FacultyProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFaculty(); }, [slug]);

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/public/faculty/${slug}`);
      setFaculty(data);
    } catch (error) {
      logger.error("Failed to fetch faculty:", error);
      navigate("/faculty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (faculty) {
      document.title =
        faculty.meta_title ||
        `${faculty.full_name} - ${faculty.designation} | Shikhor Academy`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content =
        faculty.meta_description ||
        `Learn about ${faculty.full_name}, ${faculty.designation} at Shikhor Academy.`;
    }
  }, [faculty]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-ink border-t-transparent" />
          <p className="text-sm text-slate-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-500">Faculty member not found.</p>
          <Link to="/faculty" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-brass-600">
            <ArrowLeft size={16} aria-hidden="true" /> Back to faculty
          </Link>
        </div>
      </div>
    );
  }

  const hasQual = faculty.qualifications?.length > 0;
  const hasAch = faculty.achievements?.length > 0;
  const hasCert = faculty.certifications?.length > 0;
  const hasSubjects = faculty.subjects?.length > 0;
  const hasBatches = faculty.batches?.length > 0;
  const hasGallery = faculty.galleries?.length > 0;
  const hasSocials = faculty.social_links?.length > 0;

  const expertiseTags = [];
  if (faculty.specialization) {
    faculty.specialization.split(",").forEach((s) => { const t = s.trim(); if (t) expertiseTags.push(t); });
  }
  if (faculty.research) {
    faculty.research.split(",").forEach((s) => { const t = s.trim(); if (t) expertiseTags.push(t); });
  }

  const hasGlance = faculty.teaching_experience > 0 || faculty.teaching_since || faculty.languages || faculty.employee_id || faculty.category?.name;

  return (
    <div className="min-h-screen font-sans">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Back */}
        <Link to="/faculty"
          className="mb-4 inline-flex items-center gap-1.5 rounded text-sm text-slate-500 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
          <ArrowLeft size={16} aria-hidden="true" /> Back to faculty
        </Link>

        {/* Profile header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
          className="overflow-hidden rounded-3xl border border-slate-200/80 bg-paper shadow-card"
        >
          <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:gap-9 lg:p-10">
            {/* Portrait */}
            <div className="mx-auto w-full max-w-[220px] md:mx-0">
              <div className="relative">
                <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-slate-100">
                  {faculty.profile_photo_path ? (
                    <img
                      src={buildAssetUrl(faculty.profile_photo_path)}
                      alt={faculty.full_name}
                      className="aspect-[4/5] w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fb = e.target.parentElement.querySelector('.pfp-fallback');
                        if (fb) fb.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`pfp-fallback flex aspect-[4/5] w-full items-center justify-center bg-ink/5 ${faculty.profile_photo_path ? 'hidden' : ''}`}>
                    <User size={56} className="text-ink/25" aria-hidden="true" />
                  </div>
                </div>
                <span className="pointer-events-none absolute -right-2 -top-2 h-12 w-12 rounded-tr-2xl border-r-2 border-t-2 border-brass/60" aria-hidden="true" />
              </div>
            </div>

            {/* Info */}
            <div className="text-center md:text-left">
              <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">{faculty.full_name}</h1>
              <p className="mt-1 text-base font-medium text-brass-600 sm:text-lg">{faculty.designation}</p>
              {faculty.department?.name && <p className="mt-0.5 text-sm text-slate-500">{faculty.department.name}</p>}
              <div className="mx-auto mt-4 h-px w-16 bg-brass md:mx-0" aria-hidden="true" />

              <div className="mt-4 flex flex-col items-center gap-2 md:items-start">
                {faculty.official_phone && (
                  <a href={`tel:${faculty.official_phone}`} className="inline-flex items-center gap-2 py-0.5 text-sm text-slate-600 transition-colors hover:text-ink">
                    <Phone size={15} className="text-brass-600" aria-hidden="true" /> {faculty.official_phone}
                  </a>
                )}
                {faculty.official_email && (
                  <a href={`mailto:${faculty.official_email}`} className="inline-flex items-center gap-2 py-0.5 text-sm text-slate-600 transition-colors hover:text-ink">
                    <Mail size={15} className="text-brass-600" aria-hidden="true" /> <span className="break-all">{faculty.official_email}</span>
                  </a>
                )}
                {faculty.office_address && (
                  <span className="inline-flex items-start gap-2 py-0.5 text-sm text-slate-600">
                    <MapPin size={15} className="mt-0.5 flex-shrink-0 text-brass-600" aria-hidden="true" /> {faculty.office_address}
                  </span>
                )}
              </div>

              {expertiseTags.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                  {expertiseTags.map((t, i) => (
                    <span key={`${t}-${i}`} className="rounded-full bg-brass-100 px-3 py-1 text-xs font-semibold text-brass-600">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Main */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {/* Biography */}
            {faculty.biography && (
              <section>
                <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">Biography</h2>
                <div className="mt-2 h-px w-12 bg-brass" aria-hidden="true" />
                <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-slate-600">
                  {faculty.biography.split("\n").map((para, i) => (para.trim() ? <p key={i}>{para}</p> : null))}
                </div>
              </section>
            )}

            {/* Academic Background */}
            {hasQual && (
              <section>
                <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">Academic background</h2>
                <div className="mt-2 h-px w-12 bg-brass" aria-hidden="true" />
                <div className="mt-5 space-y-4">
                  {faculty.qualifications.map((qual, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200/80 bg-paper p-5 shadow-card">
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brass-100 text-brass-600">
                          <GraduationCap size={20} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-ink">{qual.degree}{qual.field_of_study ? ` in ${qual.field_of_study}` : ""}</h3>
                          <p className="mt-0.5 text-sm text-slate-500">{qual.institution}</p>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                            {qual.passing_year && <span>{qual.passing_year}</span>}
                            {qual.grade && <span className="font-medium text-brass-600">{qual.grade}</span>}
                          </div>
                          {qual.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{qual.description}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Achievements */}
            {hasAch && (
              <section>
                <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">Achievements</h2>
                <div className="mt-2 h-px w-12 bg-brass" aria-hidden="true" />
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {faculty.achievements.map((ach, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200/80 bg-paper p-5 shadow-card">
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brass-100 text-brass-600">
                          <Award size={18} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-ink">{ach.title}</h3>
                          {ach.date && <p className="mt-0.5 text-xs text-slate-400">{ach.date}</p>}
                          {ach.description && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{ach.description}</p>}
                          {ach.category && <span className="mt-2 inline-block rounded bg-brass-100 px-2.5 py-0.5 text-xs font-medium text-brass-600">{ach.category}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {hasCert && (
              <section>
                <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">Certifications</h2>
                <div className="mt-2 h-px w-12 bg-brass" aria-hidden="true" />
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {faculty.certifications.map((cert, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200/80 bg-paper p-5 shadow-card">
                      <h3 className="text-sm font-semibold text-ink">{cert.name}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">{cert.issuing_organization}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        {cert.issue_date && <span>Issued: {cert.issue_date}</span>}
                        {cert.expiry_date && <span>Expires: {cert.expiry_date}</span>}
                      </div>
                      {cert.certificate_url && (
                        <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brass-600 hover:underline">
                          View credential <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gallery */}
            {hasGallery && (
              <section>
                <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">Gallery</h2>
                <div className="mt-2 h-px w-12 bg-brass" aria-hidden="true" />
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {faculty.galleries.map((img, i) => (
                    <a key={i} href={buildAssetUrl(img.image_path)} target="_blank" rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-xl bg-paper">
                      <img src={buildAssetUrl(img.image_path)} alt={img.caption || "Gallery image"} loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {!faculty.biography && !hasQual && !hasAch && !hasCert && !hasGallery && (
              <p className="rounded-2xl border border-slate-200/80 bg-paper p-6 text-sm text-slate-500 shadow-card">
                More details about this faculty member will be added soon.
              </p>
            )}
          </div>
          <aside className="space-y-6 lg:col-span-1">
            {/* At a glance */}
            {hasGlance && (
              <div className="rounded-2xl border border-slate-200/80 bg-paper p-5 shadow-card sm:p-6">
                <h3 className="font-display text-base font-semibold text-ink">At a glance</h3>
                <div className="mt-4 space-y-3">
                  {faculty.teaching_experience > 0 && <Glance icon={<Briefcase size={18} aria-hidden="true" />} label="Experience" value={`${faculty.teaching_experience}+ years`} />}
                  {faculty.teaching_since && <Glance icon={<Clock size={18} aria-hidden="true" />} label="Teaching since" value={faculty.teaching_since} />}
                  {faculty.languages && <Glance icon={<Globe size={18} aria-hidden="true" />} label="Languages" value={faculty.languages} />}
                  {faculty.employee_id && <Glance icon={<BadgeCheck size={18} aria-hidden="true" />} label="Employee ID" value={faculty.employee_id} />}
                  {faculty.category?.name && <Glance icon={<Users size={18} aria-hidden="true" />} label="Category" value={faculty.category.name} />}
                </div>
              </div>
            )}

            {/* Subjects */}
            {hasSubjects && (
              <div className="rounded-2xl border border-slate-200/80 bg-paper p-5 shadow-card sm:p-6">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                  <BookOpen size={16} className="text-brass-600" aria-hidden="true" /> Subjects taught
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {faculty.subjects.map((sub) => (
                    <span key={sub.id} className="rounded-full bg-paper px-3 py-1 text-sm text-slate-600">{sub.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Current batches */}
            {hasBatches && (
              <div className="rounded-2xl border border-slate-200/80 bg-paper p-5 shadow-card sm:p-6">
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                  <Layers size={16} className="text-brass-600" aria-hidden="true" /> Current batches
                </h3>
                <div className="mt-4 space-y-2">
                  {faculty.batches.map((batch, i) => (
                    <p key={i} className="text-sm text-slate-600">{batch.batch?.name || batch.name || "Batch"}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Connect */}
            {hasSocials && (
              <div className="rounded-2xl border border-slate-200/80 bg-paper p-5 shadow-card sm:p-6">
                <h3 className="font-display text-base font-semibold text-ink">Connect</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {faculty.social_links.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.platform}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-slate-600 transition-colors hover:bg-ink hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
                      <SocialIcon platform={link.platform} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Glance({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-paper p-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brass-100 text-brass-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function SocialIcon({ platform }) {
  const icons = {
    facebook: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    whatsapp: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
      </svg>
    ),
    website: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  };
  return icons[platform] || (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
