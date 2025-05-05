import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { RTExperienceLevel, RealityFocus, TransformationIntent, UserProfile } from '@/lib/types'; // Import enums and UserProfile type

// Schema for the onboarding form fields we need
const OnboardingSchema = z.object({
  name: z.string().min(1, "Name is required").nullable(),
  rtExperience: RTExperienceLevel, // Use the enum directly
  realityFocus: RealityFocus,
  transformationIntent: TransformationIntent,
});

// Extract the type for the form data
type OnboardingFormData = z.infer<typeof OnboardingSchema>;

const OnboardingForm: React.FC = () => {
  const { 
    user, 
    updateProfileAndCompleteOnboarding, 
    isProfileLoading, // Use this for loading state during submission
    profileError // Use this to display submission errors
  } = useAuth();

  const {
    handleSubmit,
    control,
    formState: { errors, isValid },
    setValue, // To set the initial name
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(OnboardingSchema),
    mode: 'onChange', // Validate on change for better UX
    defaultValues: {
      name: null, // Initialize as null, will be set by useEffect
      rtExperience: 'beginner', // Sensible default
      realityFocus: 'purpose',   // Sensible default
      transformationIntent: 'understanding', // Sensible default
    },
  });

  // Pre-fill name from user metadata when component mounts
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setValue('name', user.user_metadata.full_name, { shouldValidate: true });
    }
  }, [user, setValue]);

  const onSubmit = async (data: OnboardingFormData) => {
    console.log("Onboarding form submitted:", data);
    // We only pass the fields needed for the update, others are optional in UserProfile
    const profileUpdateData: Partial<UserProfile> = {
        name: data.name,
        rtExperience: data.rtExperience,
        realityFocus: data.realityFocus,
        transformationIntent: data.transformationIntent,
        // We can add email/avatar here too if desired and if columns exist
        // email: user?.email,
        // avatar_url: user?.user_metadata?.avatar_url
    };
    await updateProfileAndCompleteOnboarding(profileUpdateData);
    // AuthContext will handle setting isOnboardingComplete and navigating
  };

  // Helper for Radio Group options
  const renderRadioOptions = (options: { value: string; label: string }[], field: any) => (
    <RadioGroup
      onValueChange={field.onChange}
      value={field.value}
      className="grid grid-cols-2 gap-4 pt-2"
    >
      {options.map(({ value, label }) => (
        <div key={value} className="flex items-center space-x-2 bg-navy-deep/30 p-3 rounded-md border border-white/10">
          <RadioGroupItem value={value} id={`${field.name}-${value}`} />
          <Label htmlFor={`${field.name}-${value}`} className="cursor-pointer text-sm">
            {label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-4 bg-navy-deep"
    >
      <div className="w-full max-w-lg p-8 space-y-6 bg-gradient-to-br from-tufti-surface/30 to-navy-deep/50 rounded-xl shadow-lg border border-white/10">
        <h1 className="text-2xl font-bold text-center text-gray-100">
          Setup Your Reality Film Profile
          </h1>
        <p className="text-center text-gray-400 text-sm">
          Just a few details to help tailor your experience.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Field */} 
                <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">Your Name</Label>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="name"
                        placeholder="Enter your name"
                  className="bg-navy-deep/50 border-white/20 focus:border-teal-accent focus:ring-teal-accent"
                  value={field.value || ""} // Handle null value
                      />
                    )}
                  />
                  {errors.name && (
              <p className="text-red-400 text-sm">{errors.name.message}</p>
                  )}
                </div>

          {/* RT Experience */} 
                <div className="space-y-2">
            <Label className="text-gray-300">Reality Transurfing Experience</Label>
                  <Controller
                    name="rtExperience"
                    control={control}
              render={({ field }) => renderRadioOptions([
                          { value: 'newcomer', label: 'Just discovered' },
                          { value: 'aware', label: 'Aware of concepts' },
                          { value: 'beginner', label: 'Started practicing' },
                          { value: 'practitioner', label: 'Regular practice' },
                          { value: 'advanced', label: 'Advanced practitioner' }
              ], field)}
                  />
                </div>

          {/* Reality Focus */} 
                <div className="space-y-2">
            <Label className="text-gray-300">Primary Focus Area</Label>
                    <Controller
                      name="realityFocus"
                      control={control}
              render={({ field }) => renderRadioOptions([
                            { value: 'purpose', label: 'Finding Purpose' },
                            { value: 'life_changes', label: 'Life Changes' },
                            { value: 'relationships', label: 'Relationships' },
                { value: 'career', label: 'Career/Abundance' },
                { value: 'balance', label: 'Inner Balance' },
                { value: 'other', label: 'Other / General' }
              ], field)}
                    />
                  </div>

          {/* Transformation Intent */} 
                  <div className="space-y-2">
            <Label className="text-gray-300">Your Goal</Label>
                    <Controller
                      name="transformationIntent"
                      control={control}
              render={({ field }) => renderRadioOptions([
                            { value: 'understanding', label: 'Deeper Understanding' },
                { value: 'specific_situations', label: 'Handle Situations' },
                            { value: 'practice', label: 'Regular Practice' },
                { value: 'awareness', label: 'Expand Awareness' },
                { value: 'breaking_patterns', label: 'Break Patterns' },
                { value: 'other', label: 'Other / Explore' }
              ], field)}
                    />
                  </div>

          {/* Submission Error Display */} 
          {profileError && (
             <p className="text-center text-red-400 text-sm bg-red-900/40 px-4 py-2 rounded-md border border-red-700">
                {profileError}
             </p>
           )}

          {/* Submit Button */} 
            <Button
            type="submit"
            disabled={isProfileLoading || !isValid} // Disable if loading or form invalid
            className="w-full flex items-center justify-center px-6 py-3 bg-teal-accent text-navy-deep font-semibold rounded-xl hover:bg-teal-accent/90 focus:outline-none focus:ring-2 focus:ring-teal-accent focus:ring-offset-2 focus:ring-offset-navy-deep transition duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProfileLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-navy-deep" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {isProfileLoading ? 'Saving...' : 'Complete Profile'}
            </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default OnboardingForm; 