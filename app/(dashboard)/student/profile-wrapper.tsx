"use client";
import { useRouter } from "next/navigation";
import ProfileModal from "@/components/student-profile-modal";

export default function ProfileWrapper({ open, profile }: { open: boolean; profile: any }) {
  const router = useRouter();
  return (
    <ProfileModal
      open={open}
      onClose={() => router.push('/student')}
      profile={profile}
    />
  );
}
