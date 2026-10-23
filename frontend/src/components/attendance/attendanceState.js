/**
 * Remove a student's prepared WhatsApp link when a new save is starting or
 * when the latest save has no usable guardian number. Keeping an older link
 * would let the UI offer a message for a status/number that is no longer the
 * one being saved.
 */
export const withoutStudentWhatsAppLink = (links, studentId) => {
    if (!(studentId in links)) return links;
    const next = { ...links };
    delete next[studentId];
    return next;
};

// Admin /admin/batches serializes the association as `Course`, while the
// teacher batches endpoint maps it to lowercase `course`, and the daily sheet
// returns a flat `course_title`. Accept all three shapes.
export const batchCourseId = (batch = {}) =>
    batch.course_id ?? batch.course?.id ?? batch.Course?.id ?? null;

export const batchCourseTitle = (batch = {}) =>
    batch.course_title ?? batch.course?.title ?? batch.Course?.title ?? null;

