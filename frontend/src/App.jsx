// --- Privacy Policy Page Component (Updated Version) ---
const PrivacyPolicyPage = () => (
    // Style overrides for scrollability and a clean background
    <div style={{...styles.body, height: 'auto', minHeight: '100vh', overflowY: 'auto'}}>
        
        {/* Header with a back link */}
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

        {/* Main content with improved readability */}
        <main style={{
            ...styles.landingMain,
            justifyContent: 'flex-start', 
            alignItems: 'flex-start', 
            textAlign: 'left', 
            maxWidth: '800px', 
            margin: '0 auto', 
            padding: '16px 24px 80px 24px' 
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
