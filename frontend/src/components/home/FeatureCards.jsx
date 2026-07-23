import { Link } from "react-router-dom";
import { GraduationCap, Award, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: GraduationCap,
    title: "Expert Faculty",
    description: "Learn from experienced and dedicated teachers committed to your academic success.",
    to: "/faculty",
    label: "Learn More",
  },
  {
    icon: Award,
    title: "Online Results",
    description: "View examination results and track academic progress anytime, anywhere.",
    to: "/check-result",
    label: "View Results",
  },
  {
    icon: BookOpen,
    title: "Digital Library",
    description: "Access notes, study materials, previous questions and learning resources online.",
    to: "/library",
    label: "Browse Library",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function FeatureCards() {
  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1F4E79] tracking-[-1px]">
            Why Choose Uttoron?
          </h2>
          <p className="text-gray-500 text-base lg:text-lg mt-3 max-w-xl mx-auto">
            Everything you need for a modern and successful learning experience.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="group rounded-[24px] bg-white border border-gray-100 p-9 flex flex-col"
              style={{
                boxShadow: "0 4px 20px rgba(41,94,179,0.06)",
              }}
            >
              <div className="w-14 h-14 rounded-full bg-[#1F4E79]/5 flex items-center justify-center mb-6 group-hover:bg-[#1F4E79]/10 transition-colors">
                <feature.icon size={28} className="text-[#1F4E79]" />
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-6">{feature.description}</p>

              <Link
                to={feature.to}
                className="inline-flex items-center gap-2 text-[#1F4E79] font-bold text-sm group/btn w-fit"
              >
                <span className="border-b-2 border-transparent group-hover/btn:border-[#1F4E79] transition-colors">
                  {feature.label}
                </span>
                <ArrowRight
                  size={16}
                  className="group-hover/btn:translate-x-1 transition-transform"
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
