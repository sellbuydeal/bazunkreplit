import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            {!submitted ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#4A5CE8]/10 flex items-center justify-center mb-5">
                  <Mail className="w-6 h-6 text-[#4A5CE8]" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
                <p className="text-sm text-gray-500 mb-6">
                  Enter the email address on your account and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] transition-colors"
                        data-testid="input-forgot-email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4A5CE8] to-[#3B4FD8] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
                    data-testid="button-send-reset"
                  >
                    Send reset link
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-gray-500">
                  Remember your password?{" "}
                  <Link href="/login" className="text-[#4A5CE8] font-semibold hover:underline">Sign in</Link>
                </p>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Check your inbox</h2>
                <p className="text-sm text-gray-500 mb-2">
                  We've sent a password reset link to
                </p>
                <p className="text-sm font-bold text-gray-800 mb-6">{email}</p>
                <p className="text-xs text-gray-400 mb-6">
                  Didn't receive it? Check your spam folder or{" "}
                  <button onClick={() => setSubmitted(false)} className="text-[#4A5CE8] font-semibold hover:underline">
                    try again
                  </button>
                  .
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Back to sign in
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
