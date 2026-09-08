import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AiBotWidget from '@/components/AiBotWidget';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export const metadata: Metadata = {
  title: 'Insta_Rag — Multimodal RAG Personal Knowledge Base for Instagram Saved Posts',
  description:
    'Organize, categorize, and semantically search your saved Instagram posts using Gemini AI, Groq LLaMA 120B, and Vector embeddings.',
  keywords: ['Instagram', 'Saved Posts', 'AI Organizer', 'Semantic Search', 'Multimodal RAG'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#ffffff',
          colorBackground: '#0a0a0a',
          colorInputBackground: '#171717',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#a3a3a3',
        },
        elements: {
          card: 'bg-neutral-950 border border-neutral-800 shadow-2xl rounded-2xl',
          formButtonPrimary: 'bg-white text-black hover:bg-neutral-200 transition-colors',
          footerActionLink: 'text-white hover:underline',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="bg-black text-white min-h-screen flex flex-col antialiased selection:bg-white selection:text-black">
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <AiBotWidget />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
