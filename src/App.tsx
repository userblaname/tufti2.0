import React from 'react';
import Chat from './components/Chat';
import OnboardingForm from './components/onboarding/OnboardingForm';
import { useAuth } from './contexts/AuthContext';
// import SignInButton from './components/auth/SignInButton'; // Old button removed
import AuthPage from './components/auth/AuthPage'; // Import the new AuthPage
import type { UserProfile } from '@/lib/types';

// ========== DEV MODE: BYPASS AUTH ==========
const DEV_BYPASS_AUTH = false; // Set to false to restore normal auth flow

// Mock user profile for development
const DEV_USER_PROFILE: UserProfile = {
  id: '79ace784-839b-4c48-99ec-d1e71a94136e',
  name: 'Dev User',
  email: 'dev@localhost',
  avatar_url: null,
  onboarding_complete: true,
  booksRead: [],
  focusDetails: '',
  intentDetails: '',
  preferences: { theme: 'dark', notifications: true },
};
// ============================================

// Loading Screen Component
const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-navy-deep">
    <p className="text-gray-300 animate-pulse">Loading Your Reality...</p>
  </div>
);

function App() {
  const {
    user,
    isLoading,
    userProfile,
    isProfileLoading,
    isOnboardingComplete,
    signOut,
    authError,
    profileError
  } = useAuth();

  // DEV MODE: Skip all auth, go straight to Chat
  if (DEV_BYPASS_AUTH) {
    return <Chat userProfile={DEV_USER_PROFILE} signOut={async () => console.log('Dev signOut called')} />;
  }

  // Combined loading state: True if initial auth OR profile fetch is happening for a logged-in user
  const combinedIsLoading = isLoading || (user != null && isProfileLoading);

  // --- Render Logic --- 

  if (combinedIsLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // User is not logged in, show the new AuthPage with email/password and Google options
    return <AuthPage />;
  }

  // Handle Onboarding state explicitly
  if (isOnboardingComplete === false) {
    return <OnboardingForm userProfile={userProfile} />;
  }

  // Logged-in user and onboarding complete: always go to Chat
  if (userProfile) {
    return (
      <>
        <Chat userProfile={userProfile} signOut={signOut} />
      </>
    );
  }

  // Fallback case: User exists, onboarding *should* be complete, but profile is missing.
  // Display errors if available.
  console.error("Reached unexpected state: User logged in, onboarding complete, but no profile data.", { authError, profileError });
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-navy-deep text-red-400 p-4 text-center">
      <p className="mb-2">An error occurred loading your profile or session.</p>
      {profileError && <p className="mb-2 text-sm">Profile Error: {profileError}</p>}
      {authError && <p className="mb-4 text-sm">Auth Error: {authError}</p>}
      <p>Please try signing out and back in.</p>
      <button onClick={signOut} className="mt-4 underline bg-red-900/50 px-4 py-2 rounded">Sign Out</button>
    </div>
  );

}

export default App;