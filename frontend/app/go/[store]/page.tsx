import { redirect } from 'next/navigation';

interface GoPageProps {
  params: { store: string };
  searchParams: { u?: string };
}

export default function GoPage({ params, searchParams }: GoPageProps) {
  const { u } = searchParams;

  if (!u) {
    redirect('/');
  }

  try {
    const decoded = Buffer.from(u, 'base64url').toString('utf-8');
    // Validate it's a real URL from an expected domain
    const url = new URL(decoded);
    const allowedDomains = [
      'noon.com', 'amazon.sa', 'jarir.com', 'extra.com',
      'almanea.sa', 'alsaifgallery.com', 'saco.sa',
    ];
    const isAllowed = allowedDomains.some((domain) => url.hostname.endsWith(domain));

    if (isAllowed) {
      redirect(decoded);
    }
  } catch {
    // Invalid URL
  }

  redirect('/');
}
