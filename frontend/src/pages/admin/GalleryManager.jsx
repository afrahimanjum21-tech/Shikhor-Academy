import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, Trash2, Upload, ArrowLeft, X } from "lucide-react";

export default function GalleryManager() {
    const [albums, setAlbums] = useState([]);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState("");

    const fetchAlbums = async () => {
        try {
            const res = await api.get('/public/gallery');
            setAlbums(res.data);
        } catch (err) {
            console.error("Error fetching albums", err);
        }
    };

    useEffect(() => { fetchAlbums(); }, []);

    const createAlbum = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', newAlbumName);
            await api.post('/admin/gallery/album', formData);
            alert("Album Created Successfully!");
            setIsModalOpen(false);
            setNewAlbumName("");
            fetchAlbums();
        } catch (err) { 
            // বিস্তারিত এরর মেসেজ
            console.error(err);
            const msg = err.response?.data?.message || err.message || "Failed to create album";
            alert("Error: " + msg); 
        }
    };

    const handleImageUpload = async (e, albumId) => {
        const file = e.target.files[0];
        if(!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            await api.post(`/admin/gallery/${albumId}/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            alert("Image Uploaded Successfully!");
            fetchAlbums();
        } catch (err) { 
            console.error(err);
            const msg = err.response?.data?.message || err.message || "Upload failed";
            alert("Error: " + msg); 
        }
    };

    const deleteAlbum = async (id) => {
        if(confirm("Delete album and all photos?")) {
            try {
                await api.delete(`/admin/gallery/album/${id}`);
                fetchAlbums();
            } catch (err) { 
                alert("Failed to delete"); 
            }
        }
    }

    const getUrl = (path) => {
        if (!path) return "https://placehold.co/600x400?text=No+Image";
        return `http://localhost:8000/storage/${path}`;
    };

    const handleDeleteImage = async (albumId, imageId) => {
        if (!confirm("Delete this photo?")) return;
        try {
            await api.delete(`/admin/gallery/${albumId}/image/${imageId}`);
            fetchAlbums();
            // Refresh selected album state
            if (selectedAlbum) {
                const updated = await api.get('/public/gallery');
                const refreshed = updated.data.find(a => a.id === albumId);
                setSelectedAlbum(refreshed);
            }
        } catch (err) { alert("Failed to delete image"); }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* Album Detail View */}
            {selectedAlbum ? (
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setSelectedAlbum(null)} className="flex items-center gap-2 text-gray-600 hover:text-[#1F4F78] font-bold">
                            <ArrowLeft size={20} /> Back to Albums
                        </button>
                        <h2 className="text-xl font-bold text-gray-800 flex-1">{selectedAlbum.name}</h2>
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{selectedAlbum.images?.length || 0} photos</span>
                    </div>

                    {/* Upload area */}
                    <label className="flex items-center justify-center gap-2 bg-[#E6EEF5] text-[#1F4F78] p-4 rounded-lg mb-6 cursor-pointer hover:bg-[#d6e4f0] transition font-bold text-sm">
                        <Upload size={18} />
                        <span>Upload New Photo to this Album</span>
                        <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, selectedAlbum.id)} />
                    </label>

                    {/* Photos Grid */}
                    {selectedAlbum.images?.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {selectedAlbum.images.map(img => (
                                <div key={img.id} className="relative group rounded-lg overflow-hidden shadow border border-gray-200">
                                    <img src={getUrl(img.image_path)} alt="" className="w-full h-40 object-cover" onError={(e) => { e.target.src = "https://placehold.co/400x300?text=No+Image"; }} />
                                    <button onClick={() => handleDeleteImage(selectedAlbum.id, img.id)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-400">
                            <p className="text-lg">No photos in this album yet.</p>
                            <p className="text-sm mt-1">Click the upload button above to add photos.</p>
                        </div>
                    )}
                </div>
            ) : (
            /* Album List View */
            <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Gallery Management</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
                    <Plus size={18} /> New Album
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {albums.map(album => (
                    <div key={album.id} className="border rounded-lg overflow-hidden shadow-sm bg-gray-50 cursor-pointer" onClick={() => setSelectedAlbum(album)}>
                        <div className="h-40 relative group bg-gray-200">
                            <img 
                                src={getUrl(album.thumbnail || album.images?.[0]?.image_path)} 
                                className="w-full h-full object-cover"
                                alt={album.name}
                                onError={(e) => { e.target.src = "https://placehold.co/600x400?text=No+Image" }}
                            />
                            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white" onClick={(e) => e.stopPropagation()}>
                                <Upload size={24} />
                                <span className="text-xs mt-1">Upload Photo</span>
                                <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, album.id)} />
                            </label>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800">{album.name}</h3>
                                <p className="text-xs text-gray-500">{album.images?.length || 0} photos</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteAlbum(album.id); }} className="text-red-500 hover:text-red-700 p-2">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                {albums.length === 0 && <p className="text-gray-500 col-span-3 text-center py-10">No albums created yet.</p>}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">Create New Album</h3>
                        <form onSubmit={createAlbum}>
                            <input 
                                className="w-full border p-2 rounded mb-4 focus:border-blue-500 outline-none" 
                                placeholder="Album Name (e.g. Picnic 2025)" 
                                required
                                value={newAlbumName}
                                onChange={e => setNewAlbumName(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 px-4 py-2 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
}