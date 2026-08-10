import { useEffect, useState } from "react";
import { Download, Monitor, Smartphone, X, Share2, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getPlatform = () => {
    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (isIOS) return "ios";
    if (/android/i.test(ua)) return "android";
    return "desktop";
};

const getBrowser = () => {
    const ua = navigator.userAgent || "";
    if (/edg\//i.test(ua)) return "edge";
    if (/chrome|crios/i.test(ua)) return "chrome";
    if (/firefox|fxios/i.test(ua)) return "firefox";
    if (/safari/i.test(ua)) return "safari";
    return "other";
};

const isInstalledApp = () =>
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;

const HELP_STEPS = {
    ios: {
        icon: Share2,
        title: "Install on iPhone / iPad",
        steps: [
            "Open this site in Safari.",
            "Tap the Share button (square with an up arrow) in the bottom toolbar.",
            "Scroll down and tap \u201CAdd to Home Screen\u201D.",
            "Tap \u201CAdd\u201D in the top-right corner.",
        ],
        note: "Uttoron will appear on your Home Screen like a normal app and open full-screen when launched.",
    },
    android: {
        icon: Menu,
        title: "Install on Android",
        steps: [
            "Open this site in Chrome (or another Chromium browser).",
            "Tap the browser menu (three vertical dots, top-right).",
            "Tap \u201CInstall app\u201D (or \u201CAdd to Home screen\u201D on some devices).",
            "Confirm by tapping \u201CInstall\u201D.",
        ],
        note: "Uttoron will be added to your home screen and app drawer like a normal app.",
    },
    desktop: {
        icon: Monitor,
        title: "Install on Desktop",
        steps:
            getBrowser() === "firefox"
                ? [
                      "Open this site in Firefox.",
                      "Click the menu button (three horizontal lines, top-right).",
                      "Click \u201CInstall App\u201D, then confirm the installation.",
                  ]
                : [
                      "Click the install icon (monitor with a down-arrow) in the address bar.",
                      "Alternatively, click the browser menu (\u2630) and choose \u201CInstall Uttoron Coaching Centre\u201D (or \u201CCast, save, and share \u2192 Install page as app\u201D in Edge).",
                      "Confirm by clicking \u201CInstall\u201D.",
                  ],
        note: "Uttoron will open in its own window with an icon on your desktop and taskbar (or dock).",
    },
};

export default function InstallAppButton({ variant = "pill", className = "" }) {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (isInstalledApp()) {
            setInstalled(true);
            return;
        }

        if (window.__uttoronDeferredPrompt) {
            setDeferredPrompt(window.__uttoronDeferredPrompt);
        }

        const onBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const onAppInstalled = () => {
            setInstalled(true);
            setDeferredPrompt(null);
        };
        const onDisplayModeChange = (e) => {
            if (e.matches) setInstalled(true);
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onAppInstalled);
        const mql = window.matchMedia("(display-mode: standalone)");
        mql.addEventListener?.("change", onDisplayModeChange);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onAppInstalled);
            mql.removeEventListener?.("change", onDisplayModeChange);
        };
    }, []);

    const handleInstall = async () => {
        const prompt = deferredPrompt || window.__uttoronDeferredPrompt;
        if (prompt) {
            window.__uttoronDeferredPrompt = null;
            setDeferredPrompt(null);
            try {
                prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === "accepted") setInstalled(true);
            } catch (err) {
                setShowHelp(true);
            }
        } else {
            setShowHelp(true);
        }
    };

    if (installed) return null;

    const platform = getPlatform();
    const help = HELP_STEPS[platform];
    const HelpIcon = help.icon;
    const label = "Install App";

    const buttonStyles = {
        pill: `inline-flex items-center gap-1.5 bg-[#1F4E79] text-white px-3 xl:px-4 py-2 rounded-md font-bold hover:opacity-90 transition shadow-sm text-[10px] xl:text-xs uppercase whitespace-nowrap ${className}`,
        icon: `inline-flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition ${className}`,
        footer: `inline-flex items-center gap-2 text-gray-300 border border-gray-700 hover:text-white hover:border-gray-400 px-3 py-1.5 rounded-md text-xs font-semibold transition ${className}`,
    };

    return (
        <>
            <button type="button" onClick={handleInstall} className={buttonStyles[variant]} aria-label={label}>
                <Download size={variant === "icon" ? 18 : 14} />
                {variant !== "icon" && <span>{label}</span>}
            </button>

            <AnimatePresence>
                {showHelp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowHelp(false)}
                    >
                        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="install-help-title"
                            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-[#1F4E79] flex items-center justify-center text-white">
                                    <HelpIcon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 id="install-help-title" className="text-lg font-semibold text-gray-900">
                                        {help.title}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Your browser doesn't offer a one-tap install, so here's how to add Uttoron to your device.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <ol className="mt-5 space-y-3">
                                {help.steps.map((step, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="shrink-0 w-6 h-6 rounded-full bg-[#1F4E79] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
                                    </li>
                                ))}
                            </ol>

                            <p className="mt-4 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
                                <Smartphone size={13} className="inline mr-1 text-[#1F4E79]" />
                                {help.note}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
