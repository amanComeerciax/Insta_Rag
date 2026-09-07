import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: 'w-full flex justify-center',
              card: 'bg-neutral-950 border border-neutral-800 shadow-2xl rounded-2xl w-full',
              headerTitle: 'text-white text-lg font-bold',
              headerSubtitle: 'text-neutral-400 text-xs',
              socialButtonsBlockButton: 'bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 text-xs',
              socialButtonsBlockButtonText: 'text-white font-medium',
              dividerLine: 'bg-neutral-800',
              dividerText: 'text-neutral-500 text-xs',
              formFieldLabel: 'text-neutral-300 text-xs',
              formFieldInput: 'bg-neutral-900 border border-neutral-800 text-white text-xs rounded-lg focus:border-white',
              formButtonPrimary: 'bg-white text-black hover:bg-neutral-200 text-xs font-semibold py-2.5 rounded-lg transition-colors',
              footerActionLink: 'text-white hover:underline text-xs',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-neutral-400 hover:text-white',
            },
          }}
        />
      </div>
    </div>
  );
}
