import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
        `${faculty.full_name} - ${faculty.designation} | Uttoron Coaching Center`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content =
        faculty.meta_description ||
        `Learn about ${faculty.full_name}, ${faculty.designation} at Uttoron Coaching Center.`;
    }
  }, [faculty]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Faculty not found</p>
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
    faculty.specialization.split(",").forEach((s) => {
      const t = s.trim();
      if (t) expertiseTags.push(t);
    });
  }
  if (faculty.research) {
    faculty.research.split(",").forEach((s) => {
      const t = s.trim();
      if (t) expertiseTags.push(t);
    });
  }

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "Inter, Poppins, sans-serif" }}
    >
      {/* ===== SECTION 1 — FACULTY PROFILE ===== */}
      <div className="max-w-[1280px] mx-auto px-6 pt-12 pb-0">
        <div
          className="rounded-[16px] p-10 md:p-[60px]"
          style={{ backgroundColor: "#F5F5F5" }}
        >
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
            {/* ----- LEFT COLUMN (65%) ----- */}
            <div className="w-full lg:w-[65%]">
              <h1
                className="font-bold leading-[1.15] tracking-tight"
                style={{ fontSize: "46px", color: "#222222" }}
              >
                {faculty.full_name}
              </h1>

              <p className="mt-2" style={{ fontSize: "18px", color: "#555555" }}>
                {faculty.designation}
              </p>
              {faculty.department?.name && (
                <p className="mt-0.5" style={{ fontSize: "18px", color: "#555555" }}>
                  {faculty.department.name}
                </p>
              )}

              <div
                className="mt-[30px]"
                style={{
                  width: "120px",
                  height: "2px",
                  backgroundColor: "#CFCFCF",
                }}
              ></div>

              <div className="mt-[30px] grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-0">
                <div className="space-y-4">
                  {faculty.official_phone && (
                    <InfoLine label="Phone" value={faculty.official_phone} />
                  )}
                  {faculty.official_email && (
                    <InfoLine label="Email" value={faculty.official_email} />
                  )}
                  {faculty.office_address && (
                    <InfoLine label="Office" value={faculty.office_address} />
                  )}
                  {faculty.teaching_experience > 0 && (
                    <InfoLine
                      label="Experience"
                      value={`${faculty.teaching_experience} Years`}
                    />
                  )}
                  {faculty.languages && (
                    <InfoLine label="Languages" value={faculty.languages} />
                  )}
                  {faculty.teaching_since && (
                    <InfoLine label="Teaching Since" value={faculty.teaching_since} />
                  )}
                  {faculty.employee_id && (
                    <InfoLine label="Employee ID" value={faculty.employee_id} />
                  )}
                  {faculty.category?.name && (
                    <InfoLine label="Category" value={faculty.category.name} />
                  )}
                </div>

                {expertiseTags.length > 0 && (
                  <div className="mt-6 sm:mt-0">
                    <p
                      className="font-bold"
                      style={{ fontSize: "16px", color: "#222222" }}
                    >
                      Expertise
                    </p>
                    <p
                      className="mt-2 leading-relaxed"
                      style={{ fontSize: "16px", color: "#555555" }}
                    >
                      {expertiseTags.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ----- RIGHT COLUMN (35%) — Photo ----- */}
            <div className="w-full lg:w-[35%] flex justify-center lg:justify-end">
              <div
                className="w-full max-w-[360px] overflow-hidden bg-white profile-photo"
                style={{ borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
              >
                {faculty.profile_photo_path ? (
                  <img
                    src={buildAssetUrl(faculty.profile_photo_path)}
                    alt={faculty.full_name}
                    className="w-full object-cover profile-photo-img"
                    style={{ aspectRatio: "4 / 5" }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.pfp-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-full flex items-center justify-center bg-gray-100 pfp-fallback ${faculty.profile_photo_path ? 'hidden' : ''}`}
                  style={{ aspectRatio: "4 / 5" }}
                >
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ccc"
                    strokeWidth="1.5"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2 — MAIN CONTENT + SIDEBAR ===== */}
      <div className="max-w-[1280px] mx-auto px-6 pb-20" style={{ marginTop: "80px" }}>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* ----- LEFT COLUMN (70%) ----- */}
          <div className="w-full lg:w-[70%] space-y-14">
            {/* Biography */}
            {faculty.biography && (
              <section>
                <h2
                  className="font-bold"
                  style={{ fontSize: "40px", color: "#222222" }}
                >
                  Biography
                </h2>
                <div
                  className="mt-[30px] text-[17px] leading-[1.8] space-y-6 max-w-[780px]"
                  style={{ color: "#555555" }}
                >
                  {faculty.biography.split("\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Educational Qualifications */}
            {hasQual && (
              <section>
                <h2
                  className="font-bold"
                  style={{ fontSize: "28px", color: "#222222" }}
                >
                  Academic Background
                </h2>
                <div className="mt-[24px] space-y-4">
                  {faculty.qualifications.map((qual, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-[12px]"
                      style={{ backgroundColor: "#F2F2F2" }}
                    >
                      <div className="flex gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#2563EB10" }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2"
                          >
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                          </svg>
                        </div>
                        <div>
                          <h3
                            className="font-semibold"
                            style={{ fontSize: "16px", color: "#222222" }}
                          >
                            {qual.degree}
                            {qual.field_of_study ? ` in ${qual.field_of_study}` : ""}
                          </h3>
                          <p
                            className="mt-0.5"
                            style={{ fontSize: "15px", color: "#555555" }}
                          >
                            {qual.institution}
                          </p>
                          <div
                            className="flex gap-4 mt-1.5"
                            style={{ fontSize: "14px", color: "#888888" }}
                          >
                            {qual.passing_year && <span>{qual.passing_year}</span>}
                            {qual.grade && (
                              <span style={{ color: "#2563EB" }}>{qual.grade}</span>
                            )}
                          </div>
                          {qual.description && (
                            <p
                              className="mt-2 leading-relaxed"
                              style={{ fontSize: "15px", color: "#555555" }}
                            >
                              {qual.description}
                            </p>
                          )}
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
                <h2
                  className="font-bold"
                  style={{ fontSize: "28px", color: "#222222" }}
                >
                  Achievements
                </h2>
                <div className="mt-[24px] grid grid-cols-1 md:grid-cols-2 gap-4">
                  {faculty.achievements.map((ach, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-[12px]"
                      style={{ backgroundColor: "#F2F2F2" }}
                    >
                      <div className="flex gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#F59E0B15" }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#D97706"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="8" r="7" />
                            <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
                          </svg>
                        </div>
                        <div>
                          <h3
                            className="font-semibold"
                            style={{ fontSize: "15px", color: "#222222" }}
                          >
                            {ach.title}
                          </h3>
                          {ach.date && (
                            <p
                              className="mt-0.5"
                              style={{ fontSize: "13px", color: "#888888" }}
                            >
                              {ach.date}
                            </p>
                          )}
                          {ach.description && (
                            <p
                              className="mt-1.5 leading-relaxed"
                              style={{ fontSize: "14px", color: "#555555" }}
                            >
                              {ach.description}
                            </p>
                          )}
                          {ach.category && (
                            <span
                              className="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: "#2563EB10",
                                color: "#2563EB",
                              }}
                            >
                              {ach.category}
                            </span>
                          )}
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
                <h2
                  className="font-bold"
                  style={{ fontSize: "28px", color: "#222222" }}
                >
                  Certifications
                </h2>
                <div className="mt-[24px] grid grid-cols-1 md:grid-cols-2 gap-4">
                  {faculty.certifications.map((cert, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-[12px]"
                      style={{ backgroundColor: "#F2F2F2" }}
                    >
                      <h3
                        className="font-semibold"
                        style={{ fontSize: "15px", color: "#222222" }}
                      >
                        {cert.name}
                      </h3>
                      <p
                        className="mt-0.5"
                        style={{ fontSize: "14px", color: "#555555" }}
                      >
                        {cert.issuing_organization}
                      </p>
                      <div
                        className="flex gap-4 mt-1.5"
                        style={{ fontSize: "13px", color: "#888888" }}
                      >
                        {cert.issue_date && <span>Issued: {cert.issue_date}</span>}
                        {cert.expiry_date && (
                          <span>Expires: {cert.expiry_date}</span>
                        )}
                      </div>
                      {cert.certificate_url && (
                        <a
                          href={cert.certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm font-medium hover:underline"
                          style={{ color: "#2563EB" }}
                        >
                          View Credential
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
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
                <h2
                  className="font-bold"
                  style={{ fontSize: "28px", color: "#222222" }}
                >
                  Gallery
                </h2>
                <div className="mt-[24px] grid grid-cols-2 md:grid-cols-3 gap-3">
                  {faculty.galleries.map((img, i) => (
                    <a
                      key={i}
                      href={buildAssetUrl(img.image_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-[12px] overflow-hidden bg-gray-100"
                    >
                      <img
                        src={buildAssetUrl(img.image_path)}
                        alt={img.caption || "Gallery"}
                        loading="lazy"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ----- RIGHT COLUMN (30%) — Sidebar Card ----- */}
          <div className="w-full lg:w-[30%] lg:min-w-[300px]">
            <div
              className="rounded-[12px] p-[30px] space-y-8"
              style={{ backgroundColor: "#F2F2F2" }}
            >
              {/* At a Glance */}
              {(faculty.teaching_experience > 0 ||
                faculty.employee_id ||
                faculty.category?.name) && (
                <div>
                  <h3
                    className="font-bold mb-4"
                    style={{ fontSize: "18px", color: "#222222" }}
                  >
                    At a Glance
                  </h3>
                  <div className="space-y-3">
                    {faculty.teaching_experience > 0 && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: "#FFFFFF" }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#2563EB10" }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2"
                          >
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          </svg>
                        </div>
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{ color: "#888888" }}
                          >
                            Experience
                          </p>
                          <p
                            className="font-semibold text-sm"
                            style={{ color: "#222222" }}
                          >
                            {faculty.teaching_experience}+ Years
                          </p>
                        </div>
                      </div>
                    )}
                    {faculty.employee_id && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: "#FFFFFF" }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#2563EB10" }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2"
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        </div>
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{ color: "#888888" }}
                          >
                            Employee ID
                          </p>
                          <p
                            className="font-semibold text-sm"
                            style={{ color: "#222222" }}
                          >
                            {faculty.employee_id}
                          </p>
                        </div>
                      </div>
                    )}
                    {faculty.category?.name && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: "#FFFFFF" }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#2563EB10" }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{ color: "#888888" }}
                          >
                            Category
                          </p>
                          <p
                            className="font-semibold text-sm"
                            style={{ color: "#222222" }}
                          >
                            {faculty.category.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Subjects Taught */}
              {hasSubjects && (
                <div>
                  <h3
                    className="font-bold mb-4"
                    style={{ fontSize: "18px", color: "#222222" }}
                  >
                    Subjects Taught
                  </h3>
                  <div className="space-y-2.5">
                    {faculty.subjects.map((sub) => (
                      <p key={sub.id} style={{ fontSize: "16px", color: "#555555" }}>
                        {sub.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Batches */}
              {hasBatches && (
                <div>
                  <h3
                    className="font-bold mb-4"
                    style={{ fontSize: "18px", color: "#222222" }}
                  >
                    Current Batches
                  </h3>
                  <div className="space-y-2.5">
                    {faculty.batches.map((batch, i) => (
                      <p
                        key={i}
                        style={{ fontSize: "16px", color: "#555555" }}
                      >
                        {batch.batch?.name || batch.name || "Batch"}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {hasSocials && (
                <div>
                  <h3
                    className="font-bold mb-4"
                    style={{ fontSize: "18px", color: "#222222" }}
                  >
                    Connect
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {faculty.social_links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.platform}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#555555",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#2563EB";
                          e.currentTarget.style.color = "#FFFFFF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#FFFFFF";
                          e.currentTarget.style.color = "#555555";
                        }}
                      >
                        <SocialIcon platform={link.platform} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-photo-img:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="flex gap-2" style={{ fontSize: "16px" }}>
      <span className="font-bold whitespace-nowrap" style={{ color: "#222222" }}>
        {label}:
      </span>
      <span style={{ color: "#555555" }}>{value}</span>
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
