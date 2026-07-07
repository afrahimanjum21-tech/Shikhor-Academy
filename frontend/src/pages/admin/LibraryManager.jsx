import { useEffect, useState } from "react";
import api from "../../services/api";
import { useUpload } from "../../context/UploadContext";
import { Plus, MoreVertical, Trash2, Link as LinkIcon, FileText, X } from "lucide-react";

export default function LibraryManager() {
    const [materials, setMaterials] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [type, setType] = useState('file');
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const { startUpload } = useUpload();

    const fetchMaterials = async () => {
        try {
            const res = await api.get('/public/materials');
            setMaterials(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchMaterials();
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // গ্লোবাল আপলোড কনটেক্সটে আপলোড শুরু করো — ব্যাকগ্রাউন্ডে চলবে, পেজ চেঞ্জ করলেও থাকবে
        startUpload({
            title,
            type,
            file,
            url,
            onSuccess: () => {
                // সফল হলে লিস্ট রিফ্রেশ
                fetchMaterials();
            }
        });

        // মডাল বন্ধ করে ফর্ম রিসেট করো — আপলোড ব্যাকগ্রাউন্ডে চলতে থাকবে
        setIsModalOpen(false);
        setTitle('');
        setFile(null);
        setUrl('');
        setType('file');
    };

    const handleDelete = async (id) => {
        if (confirm("Delete?")) {
            await api.delete(`/admin/materials/${id}`);
            fetchMaterials();
        }
    };

    const formatSize = (bytes) => {
        if (!file) return '';
        if (file.size < 1024) return file.size + ' B';
        if (file.size < 1048576) return (file.size / 1024).toFixed(1) + ' KB';
        return (file.size / 1048576).toFixed(1) + ' MB';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Library</h1>
                    <p className="text-sm text-gray-500">Study materials & links</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-[#1F4E79] text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-[#163859]">
                    <Plus size={16} /> Add Material
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4 hidden md:table-cell">Type</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {materials.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                                <td className="p-4 flex items-center gap-3">
                                    <div className={`p-2 rounded ${item.type === 'link' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {item.type === 'link' ? <LinkIcon size={18} /> : <FileText size={18} />}
                                    </div>
                                    <span className="font-bold text-gray-800 text-sm">{item.title}</span>
                                </td>
                                <td className="p-4 hidden md:table-cell">
                                    <span className="text-xs text-gray-500 uppercase font-medium">{item.type}</span>
                                </td>
                                <td className="p-4 text-right relative">
                                    <button className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}>
                                        <MoreVertical size={16} />
                                    </button>
                                    {openMenuId === item.id && (
                                        <div className="absolute right-8 top-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-10">
                                            <button onClick={() => handleDelete(item.id)} className="w-full px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Upload Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 bg-[#1F4E79] text-white">
                            <h3 className="font-bold text-lg">Add Material</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
                                <button onClick={() => setType('file')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${type === 'file' ? 'bg-white shadow text-[#1F4E79]' : 'text-gray-500'}`}>File Upload</button>
                                <button onClick={() => setType('link')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${type === 'link' ? 'bg-white shadow text-[#1F4E79]' : 'text-gray-500'}`}>External Link</button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] outline-none"
                                    placeholder="Material Title" required
                                    value={title} onChange={e => setTitle(e.target.value)}
                                />

                                {type === 'file' ? (
                                    <div className={`border-2 border-dashed rounded-lg p-4 bg-gray-50 text-center transition-colors ${file ? 'border-[#1F4E79] bg-blue-50' : 'border-gray-300 hover:border-[#1F4E79]'}`}>
                                        <FileText size={28} className="mx-auto mb-2 text-gray-400" />
                                        <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#1F4E79] file:text-white file:text-xs file:font-bold file:cursor-pointer" />
                                        {file && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                {file.name} ({formatSize(file)})
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] outline-none"
                                        placeholder="https://example.com/resource" type="url" required
                                        value={url} onChange={e => setUrl(e.target.value)}
                                    />
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-5 py-2.5 text-sm rounded-lg font-bold bg-[#1F4E79] text-white hover:bg-[#163859] transition">
                                        Start Upload
                                    </button>
                                </div>

                                <p className="text-xs text-gray-400 text-center pt-1">
                                    Upload will continue in background even if you navigate away.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
