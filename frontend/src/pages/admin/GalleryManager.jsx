import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Plus, Trash2, Upload, ArrowLeft, X, Loader2, CheckCircle2 } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';
 
export default function GalleryManager() {
    const confirm = useConfirm();
    const [albums, setAlbums] = useState([]);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState("");
    const [uploadProgress, setUploadProgress] = useState(null);
    const uploadTimerRef = useRef(null);

    const fetchAlbums = async () => {
        try {
            const res = await api.get('/admin/gallery');
            const nextAlbums = res.data;
            setAlbums(nextAlbums);
            if (selectedAlbum) {
                setSelectedAlbum(nextAlbums.find(album => album.id === selectedAlbum.id) || null);
            }
        } catch (err) {
            logger.error("Error fetching albums", err);
        }
    };

    useEffect(() => { fetchAlbums(); }, []);

    const createAlbum = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', newAlbumName);
            await api.post('/admin/gallery/album', formData);
            notify.success("Album Created Successfully!");
            setIsModalOpen(false);
            setNewAlbumName("");
            fetchAlbums();
        } catch (err) { 
            // বিস্তারিত এরর মেসেজ
            logger.error(err);
            const msg = err.response?.data?.message || err.message || "Failed to create album";
            notify.error("Error: " + msg); 
        }
    };

    const handleImageUpload = async (e, albumId) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;

        // Vercel serverless functions reject request bodies above ~4.5MB, so
        // multiple photos must go as separate requests (one file each) instead
        // of one combined multipart payload.
        if (uploadTimerRef.current) {
            clearTimeout(uploadTimerRef.current);
            uploadTimerRef.current = null;
        }
        setUploadProgress({ total: files.length, done: 0, failed: 0, finished: false });
        let uploaded = 0;
        let failed = 0;
        let lastError = '';
        for (const file of files) {
            const formData = new FormData();
            formData.append('images', file);
            try {
                await api.post(`/admin/gallery/${albumId}/upload`, formData);
                uploaded++;
            } catch (err) {
                failed++;
                const status = err.response?.status;
                lastError = err.response?.data?.message
                    || (status === 413 ? "file too large (max ~4.5MB per photo)" : err.message || "Upload failed");
                logger.error(err);
            }
            setUploadProgress({ total: files.length, done: uploaded + failed, failed, finished: false });
        }
        if (uploaded > 0) {
            notify.success(`${uploaded} photo${uploaded > 1 ? 's' : ''} uploaded successfully${failed ? `, ${failed} failed` : ''}`);
        }
        if (failed > 0) {
            notify.error(`${failed} photo${failed > 1 ? 's' : ''} failed: ${lastError}`);
        }
        setUploadProgress({ total: files.length, done: uploaded + failed, failed, finished: true });
        uploadTimerRef.current = setTimeout(() => setUploadProgress(null), 3000);
        fetchAlbums();
    };

    const deleteAlbum = async (id) => {
        const ok = await confirm({ title: "Delete Album?", message: "Delete album and all photos?", confirmText: "Delete", variant: "destructive" }); if (ok) {
            try {
                await api.delete(`/admin/gallery/album/${id}`);
                fetchAlbums();
            } catch (err) { 
                notify.error("Failed to delete"); 
            }
        }
    }

    const getUrl = (path) => {
        if (!path) return "https://placehold.co/600x400?text=No+Image";
        return buildAssetUrl(path);
    };

    const handleDeleteImage = async (albumId, imageId) => {
        const ok = await confirm({ title: "Delete Photo?", message: "Delete this photo?", confirmText: "Delete", variant: "destructive" }); if (!ok) return;
        try {
            await api.delete(`/admin/gallery/${albumId}/image/${imageId}`);
            fetchAlbums();
            // Refresh selected album state
            if (selectedAlbum) {
                const updated = await api.get('/admin/gallery');
                const refreshed = updated.data.find(a => a.id === albumId);
                setSelectedAlbum(refreshed);
            }
        } catch (err) { notify.error("Failed to delete image"); }
    };

    return (
        <div className="space-y-4">
            {/* Album Detail View */}
            {selectedAlbum ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <button onClick={() => setSelectedAlbum(null)} className="flex items-center gap-1.5 text-gray-600 hover:text-[#1F4F78] font-bold text-sm">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <h2 className="text-base md:text-xl font-bold text-gray-800 flex-1 truncate">{selectedAlbum.name}</h2>
                        <span className="text-[10px] md:text-xs font-bold bg-gray-100 text-gray-600 px-2 md:px-3 py-1 rounded-full whitespace-nowrap">{selectedAlbum.images?.length || 0} photos</span>
                    </div>

                    {/* Upload area */}
                    <label className="flex items-center justify-center gap-2 bg-[#E6EEF5] text-[#1F4F78] p-3 md:p-4 rounded-lg mb-4 cursor-pointer hover:bg-[#d6e4f0] transition font-bold text-xs md:text-sm">
                        <Upload size={16} />
                        <span>Upload Photo to this Album</span>
                        <input type="file" multiple className="hidden" onChange={(e) => handleImageUpload(e, selectedAlbum.id)} />
                    </label>

                    {/* Photos Grid */}
                    {selectedAlbum.images?.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                            {selectedAlbum.images.map(img => (
                                <div key={img.id} className="relative group rounded-lg overflow-hidden shadow-sm border border-gray-200">
                                    <img src={getUrl(img.image_path)} alt="" className="w-full aspect-square md:aspect-auto md:h-40 object-cover" onError={(e) => { e.target.src = "https://placehold.co/400x300?text=No+Image"; }} />
                                    <button onClick={() => handleDeleteImage(selectedAlbum.id, img.id)} className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600 md:opacity-0 md:group-hover:opacity-100 opacity-100">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 md:py-16 text-gray-400">
                            <p className="text-sm md:text-lg">No photos in this album yet.</p>
                            <p className="text-xs md:text-sm mt-1">Click the upload button above to add photos.</p>
                        </div>
                    )}
                </div>
            ) : (
            /* Album List View */
            <>
            <div className="section-header">
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-primary">Gallery Management</h1>
                    <p className="text-xs md:text-sm text-gray-500">Manage photo albums and gallery images</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto">
                    <Plus size={16} /> New Album
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {albums.map(album => (
                    <div key={album.id} className="border rounded-lg overflow-hidden shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedAlbum(album)}>
                        <div className="aspect-video relative group bg-gray-100">
                            <img 
                                src={getUrl(album.thumbnail || album.images?.[0]?.image_path)} 
                                className="w-full h-full object-cover"
                                alt={album.name}
                                onError={(e) => { e.target.src = "https://placehold.co/600x400?text=No+Image" }}
                            />
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white hidden md:flex" onClick={(e) => e.stopPropagation()}>
                                <Upload size={24} />
                                <span className="text-xs mt-1">Upload</span>
                                <input type="file" multiple className="hidden" onChange={(e) => handleImageUpload(e, album.id)} />
                            </label>
                        </div>
                        <div className="p-3 md:p-4 flex justify-between items-center gap-2">
                            <div className="min-w-0">
                                <h3 className="font-bold text-sm md:text-base text-gray-800 truncate">{album.name}</h3>
                                <p className="text-[10px] md:text-xs text-gray-500">{album.images?.length || 0} photos</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <label className="md:hidden p-1.5 text-[#1F4F78] hover:bg-blue-50 rounded" onClick={(e) => e.stopPropagation()}>
                                    <Upload size={14} />
                                    <input type="file" multiple className="hidden" onChange={(e) => handleImageUpload(e, album.id)} />
                                </label>
                                <button onClick={(e) => { e.stopPropagation(); deleteAlbum(album.id); }} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {albums.length === 0 && (
                    <div className="col-span-2 md:col-span-3 py-10 text-center text-gray-400">
                        <p className="text-sm">No albums created yet.</p>
                        <p className="text-xs mt-1">Click "New Album" to create one.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 responsive-modal">
                    <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl">
                        <h3 className="font-bold text-base md:text-lg mb-4 text-gray-800">Create New Album</h3>
                        <form onSubmit={createAlbum}>
                            <input 
                                className="w-full border p-2.5 rounded-lg mb-4 focus:border-primary outline-none text-sm" 
                                placeholder="Album Name (e.g. Picnic 2025)" 
                                required
                                value={newAlbumName}
                                onChange={e => setNewAlbumName(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 px-4 py-2 text-sm hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-hover font-bold">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </>
            )}

            {uploadProgress && (
                <div className="fixed bottom-4 right-4 z-[80] w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            {uploadProgress.finished ? (
                                <>
                                    <CheckCircle2 size={16} className="text-green-500" />
                                    Upload complete
                                </>
                            ) : (
                                <>
                                    <Loader2 size={16} className="animate-spin text-[#1F4E79]" />
                                    Uploading photo {Math.min(uploadProgress.done + 1, uploadProgress.total)} of {uploadProgress.total}
                                </>
                            )}
                        </p>
                        <span className="text-xs font-bold text-[#1F4E79]">
                            {uploadProgress.total ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${uploadProgress.failed > 0 ? "bg-yellow-500" : "bg-[#1F4E79]"}`}
                            style={{ width: `${uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {uploadProgress.done - uploadProgress.failed} uploaded
                        {uploadProgress.failed > 0 ? `, ${uploadProgress.failed} failed` : ""}
                        {!uploadProgress.finished && uploadProgress.done < uploadProgress.total ? "..." : ""}
                    </p>
                </div>
            )}
        </div>
    );
}
