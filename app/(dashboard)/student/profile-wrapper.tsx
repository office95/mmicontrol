"use client";
import ProfileModal from "@/components/student-profile-modal";

export default function ProfileWrapper({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile: any;
  onClose: () => void;
}) {
  return (
    <ProfileModal
      open={open}
      onClose={onClose}
      profile={profile}
    />
  );
}
