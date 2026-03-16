import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils'; // Import the new utility
import { PageLayout } from '@/components/PageLayout'; // Import PageLayout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import { Suspense } from 'react'; // Import Suspense
import { useNavigate } from 'react-router-dom';

// A simple spinner component for fallback within the card
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

interface Campaign {
  id: string;
  name: string;
  created_at: string;
  updated_at: string; // Assuming 'updated_at' for modified_at
  // Add other campaign properties as needed
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase!.from('campaigns').select('*');
  if (error) {
    throw error; // Throw error for Suspense ErrorBoundary
  }
  return data;
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const { data: campaigns } = useSuspenseQuery<Campaign[], Error>({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
  });

  return (
    <PageLayout>
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary">Campaigns</CardTitle>      </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingSpinner />}>
            {campaigns && campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">ID</th>
                      <th className="py-2 px-4 border-b text-left">Name</th>
                      <th className="py-2 px-4 border-b text-left">Created At</th>
                      <th className="py-2 px-4 border-b text-left">Updated At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr 
                        key={campaign.id}
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2 px-4 border-b">{campaign.id}</td>
                        <td className="py-2 px-4 border-b">{campaign.name}</td>
                        <td className="py-2 px-4 border-b">{formatDate(campaign.created_at)}</td>
                        <td className="py-2 px-4 border-b">{formatDate(campaign.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No campaigns found.</p>
            )}
          </Suspense>
        </CardContent>
      </Card>
    </PageLayout>);
}
