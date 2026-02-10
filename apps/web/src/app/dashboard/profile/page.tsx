import { ProfileForm } from "@/components/dashboard/profile/profile-form";
import { CircleUser } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:w-[40%]">
      <h2 className="text-2xl font-semibold flex items-center gap-2">
        <CircleUser /> Meu Perfil
      </h2>

      <ProfileForm />
    </div>
  );
}
