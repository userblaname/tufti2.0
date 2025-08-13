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
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialCheckDone = true;
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false); // Initial auth check finished here
      if (!currentUser) {
        setIsProfileLoading(false); 
        setIsOnboardingComplete(null);
        setUserProfile(null);
        }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("Auth State Changed, Event:", _event);
        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);
        // Only set isLoading false if initial check is also done (prevents flicker)
        if (initialCheckDone) {
           setIsLoading(false);
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
                .then(({data: newProfile, error: insertError}) => {
                    if(insertError) {
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