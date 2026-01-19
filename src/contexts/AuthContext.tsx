import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types'

interface AuthContextProps {
  user: User | null
  session: Session | null
  isLoading: boolean
  isProfileLoading: boolean
  userProfile: UserProfile | null
  isOnboardingComplete: boolean | null
  authError: string | null
  profileError: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfileAndCompleteOnboarding: (profileData: Partial<UserProfile>, onboardingAnswers?: Record<string, string>) => Promise<boolean>
  supabase: typeof supabase
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let initialCheckDone = false;
    setIsLoading(true);
    console.log('[AuthContext] Initializing...')

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] getSession result:', session ? 'Session found' : 'No session', session?.user?.email)

      // Only update if we haven't already received a session from the listener (prevents race condition)
      if (!initialCheckDone) {
        // We defer to the listener if it has already fired a SIGNED_IN event, 
        // but here we just set what we have.
        // Let's just set it. 
        setSession(session);
        setUser(session?.user ?? null);
        initialCheckDone = true;
        setIsLoading(false);
      }
      // If getSession finds no user and initialCheckDone is still false (meaning listener hasn't fired yet),
      // we should still ensure profile loading states are reset.
      if (!session?.user && !initialCheckDone) { // This condition ensures we don't override listener's state
        setIsProfileLoading(false);
        setIsOnboardingComplete(null);
        setUserProfile(null);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("[AuthContext] Auth State Changed:", _event, session ? 'Session active' : 'No session');

        // Always trust the event listener as the source of truth for state changes
        setSession(session);
        const currentUser = session?.user ?? null; // Define currentUser here
        setUser(currentUser);

        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'SIGNED_OUT') {
          // Ensure loading is cleared on definitive events
          setIsLoading(false);
          initialCheckDone = true; // effectively complete initial check logic
        }

        if (!currentUser) {
          setIsProfileLoading(false);
          setIsOnboardingComplete(null);
          setUserProfile(null);
          setProfileError(null);
          setAuthError(null);
        } else {
          // User is now available or refreshed, profile fetch effect will trigger
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      // Skip re-fetching if we already have a valid profile for this user
      // This prevents Chat from unmounting on tab switch (TOKEN_REFRESHED)
      if (userProfile && userProfile.id === user.id) {
        console.log('[AuthContext] Skipping profile fetch - already loaded for user:', user.id);
        return;
      }

      console.log('User ready, fetching profile...', user.id);
      setIsProfileLoading(true);
      setProfileError(null);

      supabase
        .from('users')
        .select('*, onboarding_complete')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: existingProfile, error: selectError }) => {
          if (selectError) {
            console.error('Error checking for existing profile:', selectError.message);
            setProfileError("Could not load user profile (select failed).");
            setIsProfileLoading(false);
            setIsOnboardingComplete(false);
            return;
          }

          if (existingProfile) {
            console.log('Existing profile found:', existingProfile);
            setUserProfile(existingProfile as UserProfile);
            setIsOnboardingComplete(existingProfile.onboarding_complete || false);
            setIsProfileLoading(false);
          } else {
            console.log('No existing profile, inserting...');
            supabase
              .from('users')
              .insert({
                id: user.id,
                created_at: new Date().toISOString(),
                name: user.user_metadata?.full_name,
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url,
                onboarding_complete: false
              })
              .select('*, onboarding_complete')
              .single()
              .then(({ data: newProfile, error: insertError }) => {
                if (insertError) {
                  console.error('Error inserting new profile:', insertError.message);
                  setProfileError("Could not create user profile.");
                  setIsOnboardingComplete(false);
                } else if (newProfile) {
                  console.log('New profile inserted:', newProfile);
                  setUserProfile(newProfile as UserProfile);
                  setIsOnboardingComplete(newProfile.onboarding_complete || false);
                } else {
                  console.warn('No data returned after profile insert.');
                  setProfileError("Could not load user profile after creation.");
                  setIsOnboardingComplete(false);
                }
                setIsProfileLoading(false);
              });
          }
        });
    } else if (!isLoading && !user) {
      setIsProfileLoading(false);
      setUserProfile(null);
      setIsOnboardingComplete(null);
    }
  }, [user, isLoading]);

  const updateProfileAndCompleteOnboarding = useCallback(async (profileData: Partial<UserProfile>, _onboardingAnswers?: Record<string, string>): Promise<boolean> => {
    if (!user) {
      setProfileError("Cannot update profile: No user logged in.")
      return false
    }
    console.log('Updating profile and completing onboarding for:', user.id)
    setIsProfileLoading(true)
    setProfileError(null)

    const updateData: any = {
      ...profileData,
      onboarding_complete: true,
      onboarding_answers: _onboardingAnswers ?? {}
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      if (data) {
        console.log('Profile updated successfully:', data)
        setUserProfile(data as UserProfile)
        setIsOnboardingComplete(true)
        setProfileError(null)
        setIsProfileLoading(false)
        return true
      } else {
        throw new Error("No data returned after profile update.")
      }
    } catch (error: any) {
      console.error("Error updating profile:", error.message)
      setProfileError(`Failed to save profile: ${error.message}`)
      setIsProfileLoading(false)
      return false
    }
  }, [user])

  const signInWithGoogle = async () => {
    setIsLoading(true)
    setAuthError(null)
    try {
      console.log("Attempting Google Sign In...")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) {
        throw error
      }
      console.log("Redirecting to Google...")
    } catch (error: any) {
      console.error('Error during Google Sign In:', error.message)
      setAuthError(`Sign in failed: ${error.message || "Please try again."}`)
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    setAuthError(null)
    try {
      console.log("Attempting Sign Out...")
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      console.log("Sign out successful.")
    } catch (error: any) {
      console.error('Error during Sign Out:', error.message)
      setAuthError(`Sign out failed: ${error.message || "Please try again."}`)
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    session,
    isLoading,
    isProfileLoading,
    userProfile,
    isOnboardingComplete,
    authError,
    profileError,
    signInWithGoogle,
    signOut,
    updateProfileAndCompleteOnboarding,
    supabase,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}