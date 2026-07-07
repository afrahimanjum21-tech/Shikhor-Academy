import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        
        const result = await login({ email, password });
        
        if (result.success) {
            const storedUser = JSON.parse(localStorage.getItem('USER'));
            if (storedUser.role === 'admin' || storedUser.role === 'super_admin') navigate("/admin/dashboard");
            else if (storedUser.role === 'student') navigate(location.state?.from || "/student/dashboard");
            else navigate("/");
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center p-4">
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <h2 className="text-3xl font-bold text-center mb-2" style={{ color: '#1F4F78' }}>Welcome Back</h2>
                <p className="text-center text-gray-500 mb-8">Login to access your dashboard</p>
                
                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center border border-red-100">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
                        <input 
                            type="email" 
                            className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 transition"
                            style={{ '--tw-ring-color': '#1F4F78', borderColor: '#e5e7eb' }}
                            placeholder="example@uttoron.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                        <input 
                            type="password" 
                            className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 transition"
                            style={{ '--tw-ring-color': '#1F4F78', borderColor: '#e5e7eb' }}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full text-white font-bold py-3.5 rounded-lg transition transform hover:-translate-y-0.5 shadow-md disabled:opacity-70"
                        style={{ backgroundColor: '#1F4F78' }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Don't have an account? <Link to="/admission" className="font-bold hover:underline" style={{ color: '#1F4F78' }}>Apply for Admission</Link>
                </div>
            </div>
        </div>
    );
}