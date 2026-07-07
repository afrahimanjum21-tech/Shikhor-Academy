import { Laptop, PlayCircle, Clock, BookOpen, Lock } from "lucide-react";

export default function ELearning() {
    const videos = [
        { title: "Physics: Motion & Force", duration: "45 mins", teacher: "Rahim Sir", status: "Unlocked", thumbColor: "bg-blue-900" },
        { title: "Math: Algebra Basics", duration: "60 mins", teacher: "Karim Sir", status: "Unlocked", thumbColor: "bg-indigo-900" },
        { title: "English: Grammar Rules", duration: "30 mins", teacher: "Sonia Mam", status: "Locked", thumbColor: "bg-gray-800" },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                <Laptop size={28} /> E-Learning Platform
            </h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <BookOpen size={20} className="text-[#1F4E79]"/> Recorded Classes
                    </h3>
                    <span className="text-xs font-bold bg-[#1F4E79] text-white px-3 py-1 rounded-full">Premium</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((vid, idx) => (
                        <div key={idx} className="group cursor-pointer">
                            <div className={`relative ${vid.thumbColor} rounded-xl overflow-hidden aspect-video mb-3 shadow-md group-hover:shadow-lg transition`}>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                                    {vid.status === 'Unlocked' ? (
                                        <PlayCircle size={48} className="text-white opacity-90 group-hover:scale-110 transition" />
                                    ) : (
                                        <Lock size={32} className="text-gray-300" />
                                    )}
                                </div>
                                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                    <Clock size={10}/> {vid.duration}
                                </span>
                            </div>
                            
                            <div className="px-1">
                                <h4 className={`font-bold text-lg mb-1 group-hover:text-[#1F4E79] transition ${vid.status === 'Locked' ? 'text-gray-400' : 'text-gray-800'}`}>
                                    {vid.title}
                                </h4>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">by {vid.teacher}</span>
                                    <span className={vid.status === 'Unlocked' ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                        {vid.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}