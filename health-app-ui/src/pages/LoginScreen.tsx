import { GoogleLogin } from '@react-oauth/google';

type LoginScreenProps = {
  onLoginSuccess: (credentialResponse: { credential?: string }) => void;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => (
  <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
    <div className="text-center p-10 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
      <h1 className="text-4xl font-bold mb-2">AI Health Assistant</h1>
      <p className="text-gray-400 mb-8">Sign in with Google to begin.</p>
      <GoogleLogin 
        onSuccess={onLoginSuccess} 
        theme="filled_black" 
        shape="pill" 
        // This is the crucial fix: changing the user experience to a redirect
        ux_mode="redirect"
      />
    </div>
  </div>
);

export default LoginScreen;

