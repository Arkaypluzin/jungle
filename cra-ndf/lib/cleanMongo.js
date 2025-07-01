export function cleanMongo(obj) {
    if (Array.isArray(obj)) {
        return obj.map(cleanMongo);
    }
    if (!obj || typeof obj !== "object") return obj;
    const { _id, ...rest } = obj;
    return { ...rest, ...(_id ? { _id: _id.toString() } : {}) };
}