import { Users, GraduationCap, BookOpen, Globe } from "lucide-react";

const OPTIONS = [
    { value: 'all', label: 'All Students', icon: Globe, desc: 'Every student can access' },
    { value: 'batch', label: 'Specific Batch', icon: Users, desc: 'Only students of one batch' },
    { value: 'class', label: 'Specific Class', icon: GraduationCap, desc: 'Only students whose section matches' },
    { value: 'course', label: 'Specific Course', icon: BookOpen, desc: 'Only students enrolled in one course' },
];

export default function AccessTargetSelect({ value, batches = [], courses = [], onChange }) {
    const { access_type, batch_id, course_id, class_name } = value;

    const patch = (fields) => onChange({ ...value, ...fields });

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Who can access this?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {OPTIONS.map(opt => (
                        <label
                            key={opt.value}
                            className={`flex items-start gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer transition ${access_type === opt.value
                                ? 'border-[#1F4E79] bg-[#1F4E79]/5 ring-1 ring-[#1F4E79]'
                                : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                        >
                            <input
                                type="radio"
                                name="access_type"
                                checked={access_type === opt.value}
                                onChange={() => patch({ access_type: opt.value })}
                                className="mt-1 w-4 h-4 accent-[#1F4E79]"
                            />
                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                    <opt.icon size={14} className="text-[#1F4E79] shrink-0" /> {opt.label}
                                </span>
                                <span className="block text-[11px] text-gray-400 mt-0.5">{opt.desc}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {access_type === 'batch' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                    <select
                        value={batch_id}
                        onChange={e => patch({ batch_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]"
                    >
                        <option value="">Select a batch...</option>
                        {batches.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name}{b.Course ? ` — ${b.Course.title}` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {access_type === 'class' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class / Section</label>
                    <input
                        type="text"
                        value={class_name}
                        onChange={e => patch({ class_name: e.target.value })}
                        placeholder="e.g. HSC 1st Year, Science"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Students whose <strong>section</strong> matches this value (case-insensitive).</p>
                </div>
            )}

            {access_type === 'course' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                        value={course_id}
                        onChange={e => patch({ course_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]"
                    >
                        <option value="">Select a course...</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>
                </div>
            )}

            <p className="text-xs text-gray-400">
                Restricted items still appear in the student panel, but stay locked until the student matches the rule above.
            </p>
        </div>
    );
}

// Human-readable label for an item's access rule (used on admin cards/tables).
export function accessLabel(item) {
    const type = item?.access_type || 'all';
    if (type === 'batch') return item.Batch?.name ? `Batch: ${item.Batch.name}` : 'Batch';
    if (type === 'class') return item.class_name ? `Class: ${item.class_name}` : 'Class';
    if (type === 'course') return item.Course?.title ? `Course: ${item.Course.title}` : 'Course';
    return 'All';
}
