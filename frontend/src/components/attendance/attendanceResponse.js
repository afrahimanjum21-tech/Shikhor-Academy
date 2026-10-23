/**
 * Attendance endpoints return `{ data: ... }`. The shared API client only
 * auto-unwraps selected legacy endpoints, so attendance screens must tolerate
 * both the enveloped and already-unwrapped response shapes.
 */
export const responsePayload = (response) => {
    const body = response?.data;
    if (body && typeof body === "object" && body.data !== undefined) return body.data;
    return body;
};
