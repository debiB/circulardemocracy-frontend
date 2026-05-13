import { useSuspenseQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

interface ProfileInfo {
  firstname: string | null;
  lastname: string | null;
  job_title: string | null;
}

interface PoliticianStaffRowFromView {
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  firstname: string | null;
  lastname: string | null;
  job_title: string | null;
}

interface PoliticianStaffWithProfile {
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  profile: ProfileInfo | null;
}

async function fetchPoliticianStaff(): Promise<PoliticianStaffWithProfile[]> {
  const { data, error } = await supabase!
    .from("politician_staff_with_profile")
    .select(
      "user_id, role, created_at, updated_at, firstname, lastname, job_title",
    );

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return (data as PoliticianStaffRowFromView[]).map((row) => ({
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profile:
      row.firstname || row.lastname || row.job_title
        ? {
            firstname: row.firstname,
            lastname: row.lastname,
            job_title: row.job_title,
          }
        : null,
  }));
}

export function UsersPage() {
  const { data: staff } = useSuspenseQuery<PoliticianStaffWithProfile[], Error>(
    {
      queryKey: ["politician_staff_with_profiles"],
      queryFn: fetchPoliticianStaff,
    },
  );

  return (
    <PageLayout>
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary">Team</CardTitle>
        </CardHeader>
        <CardContent>
          {staff && staff.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">ID</th>
                    <th className="py-2 px-4 border-b text-left">First Name</th>
                    <th className="py-2 px-4 border-b text-left">Last Name</th>
                    <th className="py-2 px-4 border-b text-left">Job Title</th>
                    <th className="py-2 px-4 border-b text-left">Role</th>
                    <th className="py-2 px-4 border-b text-left">Created At</th>
                    <th className="py-2 px-4 border-b text-left">Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => {
                    const profile = member.profile;

                    const firstName = profile?.firstname || "";
                    const lastName = profile?.lastname || "";
                    const jobTitle = profile?.job_title || "";

                    return (
                      <tr key={member.user_id}>
                        <td className="py-2 px-4 border-b">{member.user_id}</td>
                        <td className="py-2 px-4 border-b">{firstName}</td>
                        <td className="py-2 px-4 border-b">{lastName}</td>
                        <td className="py-2 px-4 border-b">{jobTitle}</td>
                        <td className="py-2 px-4 border-b">{member.role}</td>
                        <td className="py-2 px-4 border-b">
                          {formatDate(member.created_at)}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {formatDate(member.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No team members found.</p>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
