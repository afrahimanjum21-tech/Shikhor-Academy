import { CheckCircle, Users, Award } from "lucide-react";

export default function About() {
    return (
        <div className="bg-white font-sans">
            {/* Header */}
            <div className="bg-blue-600 text-white py-16 text-center px-4">
                <h1 className="text-4xl font-bold mb-4">About Uttoron</h1>
                <p className="text-lg opacity-90 max-w-2xl mx-auto">
                    We are dedicated to shaping the future of students through quality education and moral values.
                </p>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Mission & Vision</h2>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                            Established in 2010, Uttoron Coaching Center has been a beacon of light for students aspiring to achieve academic excellence. Our mission is not just to help students pass exams, but to instill a deep understanding of subjects.
                        </p>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            We believe in a holistic approach to education where discipline, punctuality, and hard work are given equal importance alongside academic curriculum.
                        </p>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-500" /> <span className="font-medium text-gray-700">Experienced Faculty Members</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-500" /> <span className="font-medium text-gray-700">Modern Classrooms & Lab</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-500" /> <span className="font-medium text-gray-700">Weekly Model Tests</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-6 rounded-xl text-center">
                            <Users className="mx-auto text-blue-600 mb-2" size={40} />
                            <h3 className="text-2xl font-bold text-gray-800">5000+</h3>
                            <p className="text-sm text-gray-500">Happy Students</p>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-xl text-center">
                            <Award className="mx-auto text-emerald-600 mb-2" size={40} />
                            <h3 className="text-2xl font-bold text-gray-800">12+</h3>
                            <p className="text-sm text-gray-500">Years Experience</p>
                        </div>
                        <div className="bg-orange-50 p-6 rounded-xl text-center col-span-2">
                            <h3 className="text-2xl font-bold text-gray-800">100%</h3>
                            <p className="text-sm text-gray-500">Success Rate in Last Batch</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}