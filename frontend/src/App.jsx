import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Asset Imports ---
import logoAether from './assets/logo_aether.png';
import aetherText from './assets/aether_text.png';


// --- Firebase & API Layer (Defined before Components) ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
getFirestore(app);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const api = {
    getPrediction: async (symptoms) => (await axios.post(`${API_BASE}/predict`, { symptoms })).data || [],
    chatWithAI: async (history, predictions, location, stage) => {
        return (await axios.post(`${API_BASE}/chat`, { history, local_predictions: predictions, location, stage })).data;
    },
    getChats: async (userId) => (await axios.post(`${API_BASE}/get_chats`, { user_id: userId })).data || [],
    saveChat: async (userId, chatData) => await axios.post(`${API_BASE}/save_chat`, { userId, chatData }),
};

// --- Styles ---
const styles = {
    colors: {
        background: '#0a0a0a', surface: '#1a1a1a', primaryText: '#f5f5f5',
        secondaryText: '#a3a3a3', accent: '#2563eb', accentHover: '#1d4ed8',
        glow: 'rgba(59, 130, 246, 0.7)', subtleBorder: '#262626',
    },
    fontFamily: "'Roboto', 'Inter', system-ui, -apple-system, sans-serif",
    body: {
        margin: 0, fontFamily: "'Roboto', 'Inter', system-ui, -apple-system, sans-serif",
        backgroundColor: '#0a0a0a', color: '#a3a3a3', height: '100vh', overflow: 'hidden',
    },
    appContainer: { display: 'flex', height: '100vh' },
    mainContent: {
        flex: 1, display: 'flex', flexDirection: 'column', height: '100vh',
        transition: 'margin-left 0.3s ease-in-out', backgroundColor: 'transparent',
        position: 'relative',
    },
    landingContainer: {
        backgroundColor: '#0a0a0a', color: '#a3a3a3', height: '100vh',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
    },
    landingHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', zIndex: 100,
    },
    landingFooter: {
        display: 'flex', justifyContent: 'center', gap: '32px', padding: '24px 32px',
        zIndex: 100
    },
    landingMain: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', padding: '32px',
        gap: '24px', position: 'relative', overflow: 'hidden'
    },
    backgroundCanvas: {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: 0, opacity: 0.4
    },
    landingContent: { zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    landingTitle: {
        fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(3rem, 6vw, 4.5rem)',
        color: '#f5f5f5', margin: '0 0 16px 0', letterSpacing: '-0.025em',
        lineHeight: 1.2
    },
    landingSubtitle: {
        fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#a3a3a3',
        maxWidth: '600px', margin: '0 0 32px 0', lineHeight: 1.6,
    },
    landingButton: {
        backgroundColor: '#2563eb', color: '#f5f5f5', fontWeight: '500',
        padding: '14px 28px', borderRadius: '8px', border: 'none',
        cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '1rem',
        boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
    },
    sidebar: {
        position: 'fixed', top: 0, left: 0, height: '100%', width: '288px',
        backgroundColor: '#121212', borderRight: '1px solid #262626',
        transition: 'transform 0.3s ease-in-out', zIndex: 40,
        display: 'flex', flexDirection: 'column',
    },
    sidebarHeader: {
        padding: '1.5rem', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #262626'
    },
    sidebarNewChatBtn: {
        width: 'auto', margin: '0', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '0.5rem', padding: '12px 24px',
        fontSize: '16px', fontWeight: '500', color: '#f5f5f5',
        backgroundColor: '#2563eb', borderRadius: '8px', border: 'none',
        cursor: 'pointer', transition: 'background-color 0.2s ease',
    },
    chatListItem: {
        display: 'block', padding: '0.75rem 1.5rem', fontSize: '14px',
        borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis', color: '#a3a3a3',
        transition: 'background-color 0.2s, color 0.2s', cursor: 'pointer',
    },
    chatListItemActive: { backgroundColor: '#262626', color: '#f5f5f5' },
    chatScreen: { display: 'flex', flexDirection: 'column', height: '100%', zIndex: 1, backgroundColor: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(3px)' },
    chatMessagesContainer: { flexGrow: 1, padding: '32px', overflowY: 'auto' },
    messageBubble: {
        padding: '1rem 1.5rem', borderRadius: '1.5rem', maxWidth: '75%',
        color: '#f5f5f5', lineHeight: '1.5', wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
    },
    userMessage: {
        backgroundColor: '#2563eb',
        borderRadius: '1.5rem 1.5rem 0.25rem 1.5rem', alignSelf: 'flex-end',
    },
    modelMessage: {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderRadius: '1.5rem 1.5rem 1.5rem 0.25rem',
    },
    chatInput: {
        flexGrow: 1, padding: '1rem', backgroundColor: '#1E1E1E',
        border: '1px solid #262626', borderRadius: '8px',
        color: '#f5f5f5', fontSize: '16px', outline: 'none',
    },
    chatInputContainer: {
        display: 'flex', gap: '0.5rem', alignItems: 'center',
        padding: '0 32px 32px 32px'
    },
    sendButton: {
        padding: '12px', borderRadius: '8px', color: '#f5f5f5',
        border: 'none', cursor: 'pointer', backgroundColor: '#2563eb',
        transition: 'background-color 0.2s ease', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
    },
    analysisCard: {
        padding: '1rem', margin: '0 32px 1rem', border: '1px solid #262626',
        borderRadius: '12px', backgroundColor: 'rgba(26, 26, 26, 0.8)',
    },
    locationDisplay: {
        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center',
        gap: '0.75rem', fontSize: '14px', color: '#a3a3a3',
        borderTop: '1px solid #262626',
    },
    chip: {
        padding: '8px 16px',
        backgroundColor: 'rgba(38, 38, 38, 0.8)',
        border: `1px solid ${'#262626'}`,
        color: '#f5f5f5',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: '14px',
    },
    chipContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
        padding: '0 32px 16px 32px',
    }
};

// --- Helper Hook ---
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);
    return matches;
};

// --- SVG & Image Icons ---
const AetherLogo = () => <img src={logoAether} alt="Aether Logo" style={{width:'32px', height:'32px'}} />;
const YourLogo = () => (
    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <img src={logoAether} alt="Aether Logo" style={{height:'28px', width: '28px'}} />
        <img src={aetherText} alt="Aether" style={{height:'20px', width: 'auto'}} />
    </div>
);
const SendIcon = () => <svg style={{width:'20px',height:'20px'}} viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>;
const PlusIcon = () => <svg style={{width:'20px',height:'20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const SignOutIcon = () => <svg style={{width:'20px',height:'20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const MenuIcon = () => <svg style={{width:'24px',height:'24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const XIcon = () => <svg style={{width:'24px',height:'24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 1.85.54 3.58 1.48 5.04M12 22a10 10 0 0 0 10-10c0-1.85-.54-3.58-1.48-5.04M12 2v20m6.5-15.5-.42.42c-1.33 1.33-2.08 3.12-2.08 4.95v.21c0 1.83.75 3.62 2.08 4.95l.42.42m0-15-.42-.42c-1.33-1.33-2.08-3.12-2.08-4.95v-.21c0-1.83.75-3.62 2.08-4.95l.42-.42m-13 15 .42.42c1.33 1.33 2.08 3.12 2.08 4.95v.21c0 1.83-.75 3.62-2.08 4.95l-.42.42m0-15 .42-.42c1.33-1.33-2.08-3.12-2.08-4.95v-.21c0-1.83-.75-3.62-2.08-4.95l-.42-.42" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;

// --- Helper Components ---
const MessageChips = ({ chips, onChipClick }) => {
    if (!chips || chips.length === 0) return null;
    return (
        <div style={styles.chipContainer}>
            {chips.map((chip, index) => (
                <button 
                    key={index} 
                    style={styles.chip}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = styles.colors.accent; e.currentTarget.style.borderColor = styles.colors.accent; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(38, 38, 38, 0.8)'; e.currentTarget.style.borderColor = styles.colors.subtleBorder; }}
                    onClick={() => onChipClick(chip)}
                >
                    {chip}
                </button>
            ))}
        </div>
    );
};

const NeuralNetworkAnimation = () => {
    const canvasRef = useRef(null);
    const mouse = useRef({ x: undefined, y: undefined, radius: 150 });

    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); let animationFrameId;
        
        const handleMouseMove = (event) => {
            const rect = canvas.getBoundingClientRect();
            mouse.current.x = event.clientX - rect.left;
            mouse.current.y = event.clientY - rect.top;
        };
        const handleMouseLeave = () => {
            mouse.current.x = undefined;
            mouse.current.y = undefined;
        }

        const resizeCanvas = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.offsetWidth;
                canvas.height = canvas.parentElement.offsetHeight;
            }
        };
        let particles = []; const particleCount = 100;
        class Particle {
            constructor() {
                this.x = Math.random() * (canvas.width || 0); this.y = Math.random() * (canvas.height || 0);
                this.baseX = this.x; this.baseY = this.y;
                this.density = (Math.random() * 40) + 5;
                this.vx = (Math.random() - 0.5) * 0.6; this.vy = (Math.random() - 0.5) * 0.6;
                this.radius = Math.random() * 1.5 + 1;
            }
            update() {
                if (mouse.current.x !== undefined) {
                    let dx = mouse.current.x - this.x;
                    let dy = mouse.current.y - this.y;
                    let distance = Math.hypot(dx, dy);
                    if (distance < mouse.current.radius) {
                        let forceDirectionX = dx / distance;
                        let forceDirectionY = dy / distance;
                        let maxDistance = mouse.current.radius;
                        let force = (maxDistance - distance) / maxDistance;
                        let directionX = forceDirectionX * force * this.density;
                        let directionY = forceDirectionY * force * this.density;
                        this.x -= directionX * 0.1;
                        this.y -= directionY * 0.1;
                    } else {
                        if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 20;
                        if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 20;
                    }
                }
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }
            draw() {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(59, 130, 246, ${Math.random() * 0.5 + 0.5})`;
                ctx.fill();
            }
        }
        const init = () => {
            particles = []; for (let i = 0; i < particleCount; i++) particles.push(new Particle());
        };
        const connect = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i; j < particles.length; j++) {
                    const distance = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
                    if (distance < 120) { 
                        const opacityValue = 1 - (distance/120);
                        ctx.strokeStyle = `rgba(59, 130, 246, ${opacityValue * 0.6})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
                    }
                }
            }
        };
        const animate = () => {
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                particles.forEach(p => { p.update(); p.draw(); });
                connect();
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        const timeoutId = setTimeout(() => { resizeCanvas(); init(); animate(); }, 0);
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId); clearTimeout(timeoutId);
        };
    }, []);
    return <canvas ref={canvasRef} style={styles.backgroundCanvas} />;
};

const PageStyler = () => {
    const location = useLocation();
    useEffect(() => {
        if (location.pathname === '/privacy') {
            Object.assign(document.body.style, {
                margin: 0,
                fontFamily: styles.fontFamily,
                backgroundColor: styles.colors.background,
                color: styles.colors.secondaryText,
                height: 'auto',
                overflowY: 'auto'
            });
        } else {
            Object.assign(document.body.style, styles.body);
        }
    }, [location.pathname]);

    return null;
};

const PrivacyPolicyPage = () => (
    <div>
        <header style={{
            ...styles.landingHeader, 
            maxWidth: '850px', 
            margin: '0 auto', 
            padding: '20px 24px',
            borderBottom: `1px solid ${styles.colors.subtleBorder}`,
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(10, 10, 10, 0.7)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
        }}>
            <Link to="/" style={{ 
                color: styles.colors.primaryText, 
                textDecoration: 'none', 
                fontWeight: '500', 
                fontSize: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                transition: 'color 0.2s'
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
                Back to App
            </Link>
        </header>

        <main style={{
            ...styles.landingMain,
            justifyContent: 'flex-start', 
            alignItems: 'flex-start', 
            textAlign: 'left', 
            maxWidth: '800px', 
            margin: '0 auto', 
            padding: '16px 24px 80px 24px',
            overflow: 'visible'
        }}>
            <h1 style={{...styles.landingTitle, fontSize: 'clamp(2rem, 5vw, 2.75rem)', margin: '2rem 0 1rem' }}>Privacy Policy for Aether</h1>
            <p style={{...styles.landingSubtitle, maxWidth: '100%', margin: '0 0 2.5rem 0', color: styles.colors.secondaryText}}>
                Last Updated: September 7, 2025
            </p>
            
            <p style={{...styles.landingSubtitle, maxWidth: '100%', fontSize: '1.1rem', lineHeight: 1.7}}>This Privacy Policy describes our policies and procedures on the collection, use, and disclosure of your information when you use the Aether application (the "Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.</p>

            <h2 style={{ color: styles.colors.primaryText, fontSize: '1.75rem', marginTop: '3rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${styles.colors.subtleBorder}` }}>1. Information We Collect</h2>
            <p style={{...styles.landingSubtitle, maxWidth: '100%', fontSize: '1rem', lineHeight: 1.7 }}>We collect information that you provide directly to us and information that is collected automatically.</p>
            
            <h3 style={{ color: styles.colors.primaryText, fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '1rem' }}>Information You Provide:</h3>
            <ul style={{ paddingLeft: '20px', color: styles.colors.secondaryText, lineHeight: 1.8, fontSize: '1rem' }}>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>Account Information:</b> When you sign in using Google Authentication, we receive your name, email address, and profile picture as provided by Google.</li>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>Health & Symptom Data:</b> We collect the symptoms, age, sex, and other health-related information you voluntarily provide in your conversations with the Aether assistant.</li>
            </ul>

            <h3 style={{ color: styles.colors.primaryText, fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '1rem' }}>Information Collected Automatically:</h3>
            <ul style={{ paddingLeft: '20px', color: styles.colors.secondaryText, lineHeight: 1.8, fontSize: '1rem' }}>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>Location Information:</b> With your explicit permission, we may collect your approximate geographical location (city, country) from your browser to provide more contextually relevant analysis. You can enable or disable location services at any time through your device settings.</li>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>Usage Data:</b> Like most web services, we may automatically collect diagnostic data, such as your IP address, browser type, and device information, to maintain and improve the service.</li>
            </ul>

            <h2 style={{ color: styles.colors.primaryText, fontSize: '1.75rem', marginTop: '3rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${styles.colors.subtleBorder}` }}>2. How We Use Your Information</h2>
            <p style={{...styles.landingSubtitle, maxWidth: '100%', fontSize: '1rem', lineHeight: 1.7 }}>Your information is used for the following purposes:</p>
            <ul style={{ paddingLeft: '20px', color: styles.colors.secondaryText, lineHeight: 1.8, fontSize: '1rem' }}>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>To Provide and Maintain the Service:</b> Your symptom data and conversation history are sent to Google's Gemini API to generate responses from the AI assistant. Your location, if provided, helps tailor the analysis.</li>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>To Manage Your Account:</b> We use Google Authentication to create and secure your user account.</li>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>To Store Your Chat History:</b> Your conversations are securely stored in Google's Firebase Firestore database, linked to your user account, allowing you to review them later.</li>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>To Improve Our Service:</b> Anonymized and aggregated data may be used to analyze trends and improve the accuracy, safety, and functionality of our models and services.</li>
            </ul>

            <h2 style={{ color: styles.colors.primaryText, fontSize: '1.75rem', marginTop: '3rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${styles.colors.subtleBorder}` }}>3. Data Sharing and Disclosure</h2>
            <p style={{...styles.landingSubtitle, maxWidth: '100%', fontSize: '1rem', lineHeight: 1.7 }}>We are committed to not selling or renting your personal data to third parties. Your information is shared only with the following essential service providers to make the application function:</p>
            <ul style={{ paddingLeft: '20px', color: styles.colors.secondaryText, lineHeight: 1.8, fontSize: '1rem' }}>
                 <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>Google LLC:</b> For user authentication (Google Sign-In), database storage (Firestore), and AI processing (Gemini API). All data is handled according to Google's robust security and privacy policies. You can review the Google Privacy Policy for more information.</li>
            </ul>
             <p style={{...styles.landingSubtitle, maxWidth: '100%', fontSize: '1rem', lineHeight: 1.7 }}>We may also disclose your data if required by law or to protect the rights, property, or safety of our company, our users, or the public.</p>

            <h2 style={{ color: styles.colors.primaryText, fontSize: '1.75rem', marginTop: '3rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${styles.colors.subtleBorder}` }}>4. Data Security</h2>
            <p style={{...styles.landingSubtitle, maxWidth: '100%', fontSize: '1rem', lineHeight: 1.7 }}>The security of your data is a top priority. We rely on the industry-standard security measures provided by Google Cloud services, including data encryption in transit (TLS) and at rest. While we strive to use commercially acceptable means to protect your information, no method of transmission over the Internet is 100% secure.</p>

            <h2 style={{ color: styles.colors.primaryText, fontSize: '1.75rem', marginTop: '3rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${styles.colors.subtleBorder}` }}>5. Contact Us</h2>
            <p style={{...styles.landingSubtitle, maxWidth: '100%', fontSize: '1rem', lineHeight: 1.7 }}>If you have any questions about this Privacy Policy, please contact us:</p>
            <ul style={{ paddingLeft: '20px', color: styles.colors.secondaryText, lineHeight: 1.8, fontSize: '1rem' }}>
                <li style={{ marginBottom: '0.75rem' }}><b style={{ color: styles.colors.primaryText }}>By Email:</b> gargsatvik31@outlook.com</li>
            </ul>
        </main>
    </div>
);

const LandingPage = ({ handleLogin }) => (
    <div style={styles.landingContainer}>
        <header style={styles.landingHeader}>
            <YourLogo />
            <button 
                style={{...styles.sidebarNewChatBtn, backgroundColor: 'transparent', border: `1px solid ${styles.colors.subtleBorder}`, color: styles.colors.primaryText }} 
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = styles.colors.surface; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                onClick={handleLogin}
            >
                Login
            </button>
        </header>
        <main style={styles.landingMain}>
            <NeuralNetworkAnimation />
            <div style={styles.landingContent}>
                <h1 style={styles.landingTitle}>Intelligent Health Insights,<br />Instantly.</h1>
                <p style={styles.landingSubtitle}>Aether is your personal AI health companion, designed to help you understand your symptoms and guide you toward better well-being.</p>
                <button 
                    style={styles.landingButton} 
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = styles.colors.accentHover; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = styles.colors.accent; }}
                    onClick={handleLogin}
                >
                    Get Started For Free
                </button>
            </div>
        </main>
        <footer style={styles.landingFooter}>
            <a href="https://github.com/gargsatvik" target="_blank" rel="noopener noreferrer" style={{fontSize: '14px', color: '#a3a3a3', textDecoration: 'none'}}>My GitHub</a>
            <a href="https://github.com/gargsatvik/Health-app" target="_blank" rel="noopener noreferrer" style={{fontSize: '14px', color: '#a3a3a3', textDecoration: 'none'}}>Project Repo</a>
            <Link to="/privacy" style={{fontSize: '14px', color: '#a3a3a3', textDecoration: 'none'}}>Privacy Policy</Link>
        </footer>
    </div>
);
const InitialAnalysisCard = ({ predictions }) => {
    if (!predictions || predictions.length === 0) return null;
    return (
        <div style={styles.analysisCard}>
            <h3 style={{ ...styles.analysisTitle, color: styles.colors.primaryText, display: 'flex', alignItems: 'center', gap: '8px' }}><BrainCircuitIcon /> Initial Analysis</h3>
            {predictions.map((p, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.5rem',fontSize:'14px'}}>
                    <span style={{minWidth:'100px',flexShrink:0,color:styles.colors.secondaryText}}>{p.disease}</span>
                    <div style={{flexGrow:1,height:'8px',backgroundColor:'#262626',borderRadius:'4px',margin:'0 0.75rem',overflow:'hidden'}}>
                        <div style={{height:'100%',backgroundColor:styles.colors.accent,borderRadius:'4px',width:`${p.confidence*100}%`}} />
                    </div>
                    <span style={{minWidth:'40px',textAlign:'right',flexShrink:0,color:styles.colors.primaryText}}>{(p.confidence*100).toFixed(0)}%</span>
                </div>
            ))}
        </div>
    );
};
const ChatHistorySidebar = ({ chats, onSelectChat, activeChatId, onNewChat, user, onLogout, isSidebarOpen, setIsSidebarOpen, userLocation }) => {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const sidebarStyle = {...styles.sidebar, transform: isDesktop || isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)'};
    return (
        <>
            <div style={sidebarStyle}>
                <div style={styles.sidebarHeader}>
                    <YourLogo />
                    {!isDesktop && <button onClick={() => setIsSidebarOpen(false)} style={{background:'none',border:'none',color:'#a3a3a3',cursor:'pointer'}}><XIcon /></button>}
                </div>
                <div style={{padding:'0 1.5rem'}}><button onClick={onNewChat} style={{...styles.sidebarNewChatBtn, width:'100%', margin:0}}><PlusIcon /> New Chat</button></div>
                <div style={{flexGrow:1, padding:'1.5rem', overflowY:'auto'}}>
                    <ul style={{listStyle:'none', margin:0, padding:0, gap:'0.5rem', display:'flex', flexDirection:'column'}}>
                        {chats.map(chat => (
                            <li key={chat.id}>
                                <a onClick={(e) => { e.preventDefault(); onSelectChat(chat); }} href="#" style={{...styles.chatListItem, ...(activeChatId === chat.id && styles.chatListItemActive)}}>{chat.title || "Chat"}</a>
                            </li>
                        ))}
                    </ul>
                </div>
                <div style={styles.locationDisplay}><LocationIcon /><span>{userLocation}</span></div>
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #262626' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{display:'flex',alignItems:'center',gap:'12px',overflow:'hidden'}}>
                            <img src={user.photoURL} alt="User" style={{width:'32px',height:'32px',borderRadius:'50%'}} />
                            <span style={{fontSize:'14px',fontWeight:'500',color:'white',textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>{user.displayName}</span>
                        </div>
                        <button onClick={onLogout} style={{background:'none',border:'none',color:'#a3a3a3',cursor:'pointer'}}><SignOutIcon /></button>
                    </div>
                </div>
            </div>
            {isSidebarOpen && !isDesktop && <div onClick={() => setIsSidebarOpen(false)} style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.6)',zIndex:30}} />}
        </>
    );
};
const ChatMessage = ({ message }) => {
    const isUser = message.role === "user";

    const renderContent = (content) => {
        if (!content.includes('**')) {
            return content;
        }
        const parts = content.split(/(\*\*.*?\*\*)/g).filter(Boolean);
        return (
            <>
                {parts.map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={index} style={{ color: styles.colors.primaryText }}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={index}>{part}</span>;
                })}
            </>
        );
    };

    return (
        <div style={{ display:'flex', margin:'1rem 0', gap:'12px', justifyContent: isUser ? "flex-end" : "flex-start" }}>
            {!isUser && <div style={{width:'32px',height:'32px',backgroundColor:'#1E1E1E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><AetherLogo /></div>}
            <div style={{...styles.messageBubble, ...(isUser ? styles.userMessage : styles.modelMessage)}}>
                <p style={{ margin: 0 }}>{renderContent(message.content)}</p>
            </div>
        </div>
    );
};
const WelcomeScreen = ({ onNewChat }) => (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',padding:'1rem', zIndex: 1}}>
        <AetherLogo />
        <h2 style={{fontSize:'24px',fontWeight:400,color:'#a3a3a3',marginTop:'1rem',marginBottom:'1.5rem'}}>Welcome to Aether</h2>
        <button onClick={onNewChat} style={styles.sidebarNewChatBtn}>Start New Chat</button>
    </div>
);
const ChatScreen = ({ messages, userInput, setUserInput, handleSendMessage, loading, localPredictions, conversationStage, actionChips, onChipClick }) => {
    const chatEndRef = useRef(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, localPredictions]);

    return (
        <div style={styles.chatScreen}>
            <div style={{...styles.chatMessagesContainer, display: 'flex', flexDirection: 'column'}}>
                <div style={{flexGrow: 1}}>
                    {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                </div>
                <InitialAnalysisCard predictions={localPredictions} />
                <div ref={chatEndRef} />
            </div>
            <div style={{ borderTop: `1px solid ${styles.colors.subtleBorder}`}}>
                <MessageChips chips={actionChips} onChipClick={onChipClick} />
                <form onSubmit={(e) => handleSendMessage(e)} style={styles.chatInputContainer}>
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={
                            conversationStage === 'awaiting_name' ? 'Please enter your name...' :
                            conversationStage === 'awaiting_age' ? 'Please enter your age...' :
                            conversationStage === 'awaiting_sex' ? 'Please enter your sex...' :
                            conversationStage === 'awaiting_symptoms' ? 'Please describe your symptoms...' :
                            'Send a message...'
                        }
                        style={styles.chatInput}
                        disabled={loading}
                    />
                    <button type="submit" style={styles.sendButton} disabled={loading}>
                        {loading ? <div style={{width:'20px',height:'20px',border:'2px solid #a3a3a3',borderTopColor:'#f5f5f5',borderRadius:'50%',animation:'spin 1s linear infinite'}} /> : <SendIcon />}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Main Application Component (for the main route) ---
const MainApplication = () => {
    const [user, setUser] = useState(null);
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [localPredictions, setLocalPredictions] = useState([]);
    const [userInput, setUserInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userLocation, setUserLocation] = useState('Locating...');
    const [conversationStage, setConversationStage] = useState('greeting');
    const [actionChips, setActionChips] = useState([]);
    
    const isDesktop = useMediaQuery('(min-width: 1024px)');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchUserChats(currentUser.uid);
            } else {
                setUser(null); setChats([]); setActiveChatId(null); setMessages([]);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const response = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                        setUserLocation(`${response.data.city || 'Unknown'}, ${response.data.countryName || 'Area'}`);
                    } catch (err) { setUserLocation("Location not found"); }
                },
                () => { setUserLocation("Location access denied"); }
            );
        }
    }, [user]);

    const fetchUserChats = async (uid) => {
        try {
            const userChats = await api.getChats(uid);
            setChats(userChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        } catch (error) { console.error("Failed to fetch user chats:", error); }
    };

    const handleLogin = async () => { await signInWithPopup(auth, provider).catch(console.error); };
    const handleLogout = async () => { await signOut(auth); };
    
    const startNewChat = () => {
        setActiveChatId(uuidv4());
        setMessages([{
            role: 'model',
            content: "Hello, I'm Dr. Aether. To get started, could you please tell me your full name?"
        }]);
        setLocalPredictions([]); 
        setUserInput(""); 
        setIsSidebarOpen(false);
        setConversationStage('awaiting_name');
        setActionChips([]);
    };

    const handleSelectChat = (chat) => {
        setActiveChatId(chat.id); 
        setMessages(chat.messages);
        setLocalPredictions(chat.localPredictions || []); 
        setConversationStage('chatting');
        setIsSidebarOpen(false);
        setActionChips([]);
    };

    const handleChipClick = (chipText) => {
        handleSendMessage(null, chipText);
    };

    const handleSendMessage = async (e, messageOverride) => {
        if (e) e.preventDefault();
        const currentInput = messageOverride || userInput;
        if (!currentInput.trim() || loading) return;

        setActionChips([]);
        const userMessage = { role: "user", content: currentInput };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setUserInput("");
        setLoading(true);

        try {
            const history = updatedMessages.map(m => ({ role: m.role, parts: [m.content] }));
            
            let stageForBackend = conversationStage;
            if (conversationStage === 'awaiting_symptoms') {
                stageForBackend = 'process_symptoms';
            }

            const res = await api.chatWithAI(history, localPredictions, userLocation, stageForBackend);
            
            let modelReply = res.reply;
            let chips = [];

            // More robust regex to find and parse [CHIPS: ...]
            const chipRegex = /\[CHIPS:\s*(\[.*?\])\]/s;
            const chipMatch = modelReply.match(chipRegex);
            if (chipMatch && chipMatch[1]) {
                try {
                    // The captured group (chipMatch[1]) is the JSON array string.
                    // Sanitize it to handle single quotes from the model if they appear.
                    const chipString = chipMatch[1].replace(/'/g, '"');
                    chips = JSON.parse(chipString);
                } catch (error) {
                    console.error("Failed to parse chips JSON:", chipMatch[1], error);
                    // If parsing fails, chips will remain an empty array.
                }
                // Always remove the CHIPS tag from the displayed message.
                modelReply = modelReply.replace(chipMatch[0], '').trim();
            }

            // More robust regex for [SUMMARY: ...]
            const summaryRegex = /\[SUMMARY:\s*(\{.*?\})\]/s;
            const summaryMatch = modelReply.match(summaryRegex);
            if (summaryMatch && summaryMatch[1]) {
                try {
                     // Sanitize string to handle single quotes.
                    const summaryString = summaryMatch[1].replace(/'/g, '"');
                    const summary = JSON.parse(summaryString);
                    const trailingText = modelReply.replace(summaryMatch[0], '').trim();
                    
                    modelReply = `**Summary:**\n${summary.recap}\n\n` +
                                 `**Possible Causes:**\n${summary.possibilities}\n\n` +
                                 `**Home Care Advice:**\n${summary.homeCare.map(item => `• ${item}`).join('\n')}\n\n` +
                                 `**Recommendation:**\n${summary.recommendation}\n\n` +
                                 trailingText;

                } catch (error) {
                    console.error("Failed to parse summary JSON:", summaryMatch[1], error);
                }
                 // Always remove the SUMMARY tag from the displayed message.
                modelReply = modelReply.replace(summaryMatch[0], '').trim();
            }
            
            setActionChips(chips);
            const finalMessages = [...updatedMessages, { role: "model", content: modelReply }];
            
            if (res.predictions && res.predictions.length > 0) {
                setLocalPredictions(res.predictions);
            }

            setMessages(finalMessages);

            if (conversationStage === 'awaiting_name') setConversationStage('awaiting_age');
            else if (conversationStage === 'awaiting_age') setConversationStage('awaiting_sex');
            else if (conversationStage === 'awaiting_sex') setConversationStage('awaiting_symptoms');
            else if (stageForBackend === 'process_symptoms') setConversationStage('chatting');
            
            const chatToSave = {
                id: activeChatId, messages: finalMessages, 
                localPredictions: res.predictions || localPredictions,
                timestamp: new Date().toISOString(),
                title: finalMessages.find(m => m.role === 'user')?.content.substring(0, 40) || "New Chat"
            };

            await api.saveChat(user.uid, chatToSave);
            fetchUserChats(user.uid);

        } catch (err) {
            console.error("Error in chat flow:", err);
            setMessages(prev => [...prev, {role: "model", content: "Sorry, an error occurred."}]);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <LandingPage handleLogin={handleLogin} />;
    }
    
    return (
        <div style={styles.appContainer}>
            <ChatHistorySidebar user={user} chats={chats} onSelectChat={handleSelectChat} activeChatId={activeChatId} onNewChat={startNewChat} onLogout={handleLogout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} userLocation={userLocation} />
            <main style={{ ...styles.mainContent, marginLeft: isDesktop ? '288px' : '0' }}>
                 <NeuralNetworkAnimation />
                {!isDesktop && <button onClick={() => setIsSidebarOpen(true)} style={{ position:'fixed',top:'1rem',left:'1rem',zIndex:50,background:'rgba(30,41,59,0.5)',border:'none',padding:'0.5rem',borderRadius:'8px',color:'white',cursor:'pointer' }}><MenuIcon /></button>}
                {activeChatId ? (
                     <ChatScreen 
                        messages={messages} 
                        userInput={userInput} 
                        setUserInput={setUserInput} 
                        handleSendMessage={handleSendMessage} 
                        loading={loading} 
                        localPredictions={localPredictions} 
                        conversationStage={conversationStage}
                        actionChips={actionChips}
                        onChipClick={handleChipClick}
                    />
                ) : ( <WelcomeScreen onNewChat={startNewChat} /> )}
            </main>
        </div>
    );
}

// --- App Component (Router Logic) ---
function App() {
    const [authReady, setAuthReady] = useState(false);
    
    useEffect(() => {
        // This useEffect now ONLY handles the font/animation stylesheet and auth state.
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Inter:wght@600;700&display=swap'); @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
        document.head.appendChild(styleSheet);
        
        const unsubscribe = auth.onAuthStateChanged(() => {
            setAuthReady(true);
        });

        return () => { 
            styleSheet.parentNode?.removeChild(styleSheet);
            unsubscribe();
        };
    }, []);

    if (!authReady) {
        // Use the non-scrolling style for the initial blank loading screen
        return <div style={styles.body}></div>;
    }
    
    return (
        <BrowserRouter>
            {/* This new component will manage the body styles for each route */}
            <PageStyler /> 
            <Routes>
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/" element={<MainApplication />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

