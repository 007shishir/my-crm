"use client";

import { signIn, signUp } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle state
  const [showPassword, setShowPassword] = useState(false); // Password visibility

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp) {
      await signUp.email({
        email,
        password,
        name: name || "New Guest",
        role: "guest", // automatically assign guest for this initial setup
        callbackURL: "/"
      }, {
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        }
      });
    } else {
      await signIn.email({
        email,
        password,
        callbackURL: "/"
      }, {
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm shadow-2xl bg-base-100">
        <form onSubmit={handleSubmit} className="card-body">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {isSignUp ? "Sign Up" : "Global Group CRM"}
            </h2>
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-bold text-primary hover:underline"
            >
              {isSignUp ? "Back to Login" : "Sign Up"}
            </button>
          </div>
          
          {error && (
            <div className="alert alert-error text-sm p-2 rounded mb-4">
              {error}
            </div>
          )}

          {isSignUp && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-xs uppercase opacity-70">Name</span>
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
              />
            </div>
          )}

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text font-bold text-xs uppercase opacity-70">Email</span>
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text font-bold text-xs uppercase opacity-70">Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="input input-bordered w-full pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 opacity-50 hover:opacity-100"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="form-control mt-8">
            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : isSignUp ? "Create Account" : "Secure Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
