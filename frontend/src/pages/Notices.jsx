import { useEffect, useState } from "react";
import api from "../services/api";
import { Bell, Calendar } from "lucide-react";

export default function Notices() {
    const [notices, setNotices] = useState([]);

    useEffect(() => {
        api.get('/public/notices').then(res => setNotices(res.data));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-2" style={{ color: '#1F4F78' }}>
                        <Bell size={36} /> Notice Board
                    </h1>
                    <p className="text-gray-600">Latest updates and announcements</p>
                </div>

                <div className="space-y-6">
                    {notices.map(notice => (
                        <div key={notice.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 hover:shadow-lg transition" style={{ borderColor: '#1F4F78' }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-bold px-2 py-1 rounded uppercase bg-opacity-10" 
                                          style={{ 
                                              backgroundColor: notice.type === 'urgent' ? '#fee2e2' : 'rgba(31, 79, 120, 0.1)', 
                                              color: notice.type === 'urgent' ? '#b91c1c' : '#1F4F78' 
                                          }}>
                                        {notice.type}
                                    </span>
                                    <h3 className="text-xl font-bold mt-2 text-gray-800">{notice.title}</h3>
                                    <p className="text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">{notice.description}</p>
                                </div>
                                <div className="text-center bg-gray-50 p-3 rounded-lg min-w-[80px]">
                                    <Calendar size={20} className="mx-auto text-gray-400 mb-1"/>
                                    <span className="text-xs font-bold text-gray-600 block whitespace-nowrap">{notice.date}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}