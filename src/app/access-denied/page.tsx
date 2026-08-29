import Link from "next/link";
import Image from "next/image";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldX className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Access denied
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          NUSkor is restricted to institutional accounts. If you signed in with
          a different email, sign out and try again with your FAST-NUCES Lahore
          account.
        </p>
        <div className="mt-6 flex justify-center">
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-dark">
              <ArrowLeft className="h-4 w-4" /> Sign out &amp; try again
            </button>
          </form>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink/40">
          <div className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-gold">
            <Image src="/logo.png" alt="NUSkor" fill sizes="24px" className="object-cover" />
          </div>
          NUSkor · Empowering Students. Elevating Futures.
        </div>
      </div>
      <Link href="/" className="mt-4 text-sm font-semibold text-gold-deep hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}