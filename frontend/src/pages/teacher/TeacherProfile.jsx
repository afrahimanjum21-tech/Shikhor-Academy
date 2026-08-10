import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { buildAssetUrl } from "../../services/config";
import { User, Mail, Phone, Calendar, Edit, Camera, Lock } from "lucide-react";
import PasswordInput from "../../components/common/PasswordInput";
import notify from "../../services/notification";
import logger from '../../services/logger';

export default function TeacherProfile() {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', bio: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/teacher/profile');
            setProfile(data);
            setFormData({
                name: data.name || '',
                phone: data.phone || '',
                bio: data.TeacherProfile?.bio || ''
            });
        } catch (error) {
            logger.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            await api.put('/teacher/profile', formData);
            await fetchProfile();
            setIsEditing(false);
            notify.success('Profile updated successfully');
        } catch (error) {
            logger.error('Failed to update profile:', error);
            notify.error('Failed to update profile');
        }
    };

    const fileInputRef = useRef(null);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('photo', file);
        try {
            await api.post('/teacher/profile/photo', formData);
            await fetchProfile();
            refreshUser();
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            notify.error(error.response?.data?.message || 'Failed to upload photo');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.post('/teacher/profile/change-password', {
                current_password: formData.get('current_password'),
                new_password: formData.get('new_password'),
                new_password_confirmation: formData.get('new_password_confirmation'),
            });
            notify.success('Password changed successfully');
            e.target.reset();
        } catch (error) {
            logger.error('Failed to change password:', error);
            notify.error('Failed to change password');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    const rawPhotoPath = profile?.profile_photo_path;
    const photoUrl = buildAssetUrl(rawPhotoPath);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="flex items-start gap-6">
                    <div className="relative">
                        <div className="h-32 w-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-200">
                            {photoUrl ? (
                                <img src={photoUrl} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#1F4E79] text-white font-bold text-3xl">
                                    {profile?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-2 bg-[#1F4E79] rounded-full cursor-pointer hover:bg-[#1a3d66] transition-colors">
                            <Camera className="text-white" size={16} />
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                    </div>
                    <div className="flex-1">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        rows={3}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleUpdate} className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors">
                                        Save Changes
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-800">{profile?.name}</h2>
                                    <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-[#1F4E79] transition-colors">
                                        <Edit size={20} />
                                    </button>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Mail size={16} /> {profile?.email}
                                    </div>
                                    {profile?.phone && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Phone size={16} /> {profile.phone}
                                        </div>
                                    )}
                                    {profile?.TeacherProfile?.joining_date && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar size={16} /> Joined: {new Date(profile.TeacherProfile.joining_date).toLocaleDateString()}
                                        </div>
                                    )}
                                    {profile?.TeacherProfile?.designation && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <User size={16} /> {profile.TeacherProfile.designation}
                                        </div>
                                    )}
                                    {formData.bio && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700">{formData.bio}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Lock className="text-[#1F4E79]" /> Change Password
                </h2>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <PasswordInput
                            name="current_password"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <PasswordInput
                            name="new_password"
                            required
                            minLength={8}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <PasswordInput
                            name="new_password_confirmation"
                            required
                            minLength={8}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                        />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors">
                        Change Password
                    </button>
                </form>
            </div>
        </div>
    );
}
