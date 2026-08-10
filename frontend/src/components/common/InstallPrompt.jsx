import { useCallback, useEffect, useState } from "react";
import { Download, X, Share2, Menu, Monitor, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "ucc_pwa_install_dismissed_at";
const INSTALLED_KEY = "ucc_pwa_install_done";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // don't nag again for 7 days
const SHOW_DELAY_MS = 4000;

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

const readFlag = (key) => {
    try {
        return localStorage.getItem(key);
    } catch (err) {
        return null;
    }
};

const writeFlag = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        // Private-mode browsers may block storage; nothing to do.
    }
};

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
                      "Alternatively, open the browser menu (\u2630) and choose \u201CInstall Uttoron Coaching Centre\u201D (or \u201CCast, save, and share \u2192 Install page as app\u201D in Edge).",
                      "Confirm by clicking \u201CInstall\u201D.",
                  ],
        note: "Uttoron will open in its own window with an icon on your desktop and taskbar (or dock).",
    },
};

export default function InstallPrompt() {
    const [visible, setVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
    const [installed, setInstalled] = useState(false);

    const shouldShow = useCallback(() => {
        if (!import.meta.env.PROD) return false;
        if (isInstalledApp()) return false;
        if (readFlag(INSTALLED_KEY)) return false;
        const dismissedAt = Number(readFlag(DISMISS_KEY));
        if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) return false;
        return true;
    }, []);

    useEffect(() => {
        if (window.__uttoronDeferredPrompt) {
            setDeferredPrompt(window.__uttoronDeferredPrompt);
        }

        const onBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const onAppInstalled = () => {
            writeFlag(INSTALLED_KEY, String(Date.now()));
            setInstalled(true);
            setVisible(false);
        };
        const onDisplayModeChange = (e) => {
            if (e.matches) {
                writeFlag(INSTALLED_KEY, String(Date.now()));
                setInstalled(true);
                setVisible(false);
            }
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onAppInstalled);
        const mql = window.matchMedia("(display-mode: standalone)");
        mql.addEventListener?.("change", onDisplayModeChange);

        let timer;
        if (shouldShow()) {
            timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
        }

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onAppInstalled);
            mql.removeEventListener?.("change", onDisplayModeChange);
        };
    }, [shouldShow]);

    const handleInstall = async () => {
        const prompt = deferredPrompt || window.__uttoronDeferredPrompt;
        if (prompt) {
            window.__uttoronDeferredPrompt = null;
            setDeferredPrompt(null);
            try {
                prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === "accepted") {
                    writeFlag(INSTALLED_KEY, String(Date.now()));
                    setInstalled(true);
                    setVisible(false);
                }
            } catch (err) {
                setShowHelp(true);
            }
        } else {
            setShowHelp(true);
        }
    };

    const handleDismiss = () => {
        writeFlag(DISMISS_KEY, String(Date.now()));
        setVisible(false);
    };

    if (installed) return null;

    const platform = getPlatform();
    const help = HELP_STEPS[platform];
    const HelpIcon = help.icon;

    return (
        <>
            <AnimatePresence>
                {visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        role="dialog"
                        aria-label="Install Uttoron as an app"
                        className="fixed bottom-4 left-4 right-4 z-[90] sm:left-auto sm:right-4 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                    >
                        <div className="flex items-start gap-3 p-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-[#1F4E79] flex items-center justify-center text-white">
                                <Download size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900">Download as an App</p>
                                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                                    Install Uttoron Coaching Center on your device for a faster and more convenient experience.
                                </p>
                                <div className="mt-3 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleInstall}
                                        className="bg-[#1F4E79] text-white px-4 py-1.5 rounded-md text-xs font-bold hover:opacity-90 transition shadow-sm"
                                    >
                                        Install
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDismiss}
                                        className="text-gray-500 hover:text-gray-700 text-xs font-medium transition"
                                    >
                                        Maybe later
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Dismiss"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
