import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold text-gray-900">
        Authentication error
      </h1>
      <p className="text-center text-gray-600">
        Sign-in could not be completed. The link may have expired or been used
        already.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-[#FF6B6B] px-4 py-2 font-medium text-white hover:opacity-90"
      >
        Try again
      </Link>
    </div>
  );
}
