// Strict boolean parser for multipart / query-string / form inputs: only true,
// 'true', 1, '1' are truthy. Fixes the `Boolean('false') === true` trap so a
// form that submits the string 'false' actually disables the flag.
export const parseBool = (v) => v === true || v === 1 || v === 'true' || v === '1';

export default parseBool;
