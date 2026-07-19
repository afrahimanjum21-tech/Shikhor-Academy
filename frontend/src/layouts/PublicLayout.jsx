import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import ErrorBoundary from "../components/common/ErrorBoundary";
import HERO_IMAGE from "../images/hero-background.jpg";

export default function PublicLayout() {
    const location = useLocation();
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="fixed inset-0 -z-10">
                <img src={HERO_IMAGE} alt=""
                    className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-white/75"></div>
            </div>
            <main className="flex-1 relative z-0">
                <ErrorBoundary key={location.pathname}>
                    <Outlet />
                </ErrorBoundary>
            </main>
            <Footer />
        </div>
    );
}