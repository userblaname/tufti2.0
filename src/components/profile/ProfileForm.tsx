import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"
import { Upload, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserProfile } from "@/lib/types"
import { UserProfileSchema } from "@/lib/types"

interface ProfileFormProps {
  profile: UserProfile
  onSave: (profile: UserProfile) => Promise<void>
}

export default function ProfileForm({ profile, onSave }: ProfileFormProps) {
  const { toast } = useToast()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UserProfile>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: profile
  })

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive"
      })
      return
    }

    try {
      // Handle image upload logic here
      toast({
        title: "Success",
        description: "Profile picture updated"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      })
    }
  }

  const onSubmit = async (data: UserProfile) => {
    try {
      await onSave(data)
      toast({
        title: "Success",
        description: "Profile updated successfully"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatarUrl} alt={profile.name} />
            <AvatarFallback className="bg-tufti-red text-tufti-white text-2xl">
              {profile.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Label
            htmlFor="avatar"
            className="absolute bottom-0 right-0 p-1 bg-tufti-black rounded-full cursor-pointer hover:bg-tufti-red/90 transition-colors"
          >
            <Upload className="w-4 h-4 text-tufti-white" />
            <input
              type="file"
              id="avatar"
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
            />
          </Label>
        </div>

        <div className="flex-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name")}
            className="bg-tufti-black/50"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            className="bg-tufti-black/50"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            {...register("bio")}
            className="bg-tufti-black/50 min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="intention">Intention</Label>
          <Input
            id="intention"
            {...register("intention")}
            className="bg-tufti-black/50"
          />
          {errors.intention && (
            <p className="text-red-500 text-sm mt-1">{errors.intention.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="challenge">Current Challenge</Label>
          <Input
            id="challenge"
            {...register("challenge")}
            className="bg-tufti-black/50"
          />
          {errors.challenge && (
            <p className="text-red-500 text-sm mt-1">{errors.challenge.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="aspiration">Aspiration</Label>
          <Input
            id="aspiration"
            {...register("aspiration")}
            className="bg-tufti-black/50"
          />
          {errors.aspiration && (
            <p className="text-red-500 text-sm mt-1">{errors.aspiration.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        <Save className="w-4 h-4 mr-2" />
        Save Changes
      </Button>
    </motion.form>
  )
}