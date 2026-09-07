import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'SaveSort AI — AI-Powered Instagram Saved Posts Organizer',
  description:
    'Organize, categorize, and semantically search your saved Instagram posts using Gemini AI and pgvector embeddings.',
  keywords: ['Instagram', 'Saved Posts', 'AI Organizer', 'Semantic Search', 'pgvector'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white min-h-screen flex flex-col antialiased selection:bg-white selection:text-black">
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
