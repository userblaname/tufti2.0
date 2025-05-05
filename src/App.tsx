import React from 'react';
import Chat from './components/Chat';
import { useAuth } from './contexts/AuthContext';
// import SignInButton from './components/auth/SignInButton'; // Old button removed
import AuthPage from './components/auth/AuthPage'; // Import the new AuthPage
import OnboardingForm from './components/onboarding/OnboardingForm';
import type { UserProfile } from '@/lib/types';

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
    authError, // Get authError to potentially display on fallback
    profileError // Get profileError to potentially display on fallback
  } = useAuth();

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

  // User exists, but onboarding isn't complete yet
  if (!isOnboardingComplete) {
    return <OnboardingForm />;
  }

  // User exists AND onboarding is complete AND profile is loaded
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