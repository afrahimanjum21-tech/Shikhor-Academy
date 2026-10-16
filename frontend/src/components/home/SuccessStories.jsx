import { useEffect, useState } from "react";
import { Trophy, Quote, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import logger from '../../services/logger';

export default function SuccessStories() {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    api.get('/public/success-stories')
      .then(res => setStories(Array.isArray(res.data) ? res.data.slice(0, 6) : []))
      .catch(err => logger.error('Failed to fetch success stories:', err));
  }, []);

  if (stories.length === 0) return null;

  return (
    <section className="bg-paper py-9 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-12 sm:gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-0.5 font-bangla text-sm text-brass-600 sm:mb-2 sm:text-lg">ফলাফলেই আমাদের পরিচয়</p>
            <h2 className="font-display text-xl font-semibold text-ink sm:text-3xl lg:text-4xl">Success stories</h2>
            <p className="mt-1.5 text-xs text-slate-500 sm:mt-3 sm:text-base">Real students, real results — the proudest proof of what disciplined coaching achieves.</p>
          </div>
          <Link to="/success-stories"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary transition-colors hover:text-brass-600">
            See all stories <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {stories.map((story, idx) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.08, duration: 0.5 }}
              className="flex flex-col rounded-xl border border-slate-100 bg-paper p-4 shadow-card transition-shadow hover:shadow-card-lg sm:rounded-2xl sm:p-7"
            >
              <Quote size={24} className="mb-3 text-brass" aria-hidden="true" />
              <p className="flex-1 text-sm leading-relaxed text-slate-600 line-clamp-4 sm:text-base sm:line-clamp-5">{story.story}</p>
              <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 sm:mt-6 sm:pt-5">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink/5 ring-2 ring-brass-100">
                  {story.photo
                    ? <img src={buildAssetUrl(story.photo)} alt={story.student_name} loading="lazy" className="h-full w-full object-cover" />
                    : <Trophy size={18} className="text-brass-600" aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{story.student_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {story.achievement && (
                      <span className="rounded-full bg-brass-100 px-2.5 py-0.5 text-xs font-semibold text-brass-600">{story.achievement}</span>
                    )}
                    {story.batch_info && <span className="truncate text-xs text-slate-400">{story.batch_info}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
