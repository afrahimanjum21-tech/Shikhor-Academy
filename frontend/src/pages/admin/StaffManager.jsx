import { useState } from "react";
import { Users, Presentation } from "lucide-react";
import TeacherManager from "./TeacherManager";
import FacultyManager from "./FacultyManager";

const TABS = [
  { key: "teachers", label: "Teachers & Staff", icon: <Users size={18} /> },
  { key: "faculty", label: "Faculty Showcase", icon: <Presentation size={18} /> },
];

export default function StaffManager() {
  const [activeTab, setActiveTab] = useState("teachers");

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 grid grid-cols-2 gap-0 sm:flex sm:flex-row sm:gap-1 sm:w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-5 py-2 sm:py-2.5 whitespace-nowrap rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-[#1F4E79] text-white shadow-sm"
                : "text-gray-500 hover:text-[#1F4E79] hover:bg-gray-50"
            }`}
          >
            {tab.icon} <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "teachers" && <TeacherManager />}
        {activeTab === "faculty" && <FacultyManager />}
      </div>
    </div>
  );
}
