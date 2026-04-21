import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInLocal, signInWithMagicLocal, signUpLocal } from "@/lib/db";
import { Mail, Lock, Loader2, ArrowRight, User } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, onSuccess }) => {
  const [mode, setMode] = useState<"login" | "signup" | "magic">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await signInLocal(email, password);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Unable to sign in.");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await signUpLocal(email, password);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Unable to create account.");
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await signInWithMagicLocal(email);
      setSuccess("Signed in with local magic mode.");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Unable to use magic mode.");
    }
    setLoading(false);
  };

  const handleSubmit =
    mode === "login"
      ? handleLogin
      : mode === "signup"
        ? handleSignup
        : handleMagicLink;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white text-center">
            {mode === "login"
              ? "Welcome Back"
              : mode === "signup"
                ? "Create Account"
                : "Magic Link"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-center">
            {mode === "login"
              ? "Sign in to access the admin dashboard"
              : mode === "signup"
                ? "Create your admin account"
                : "Quick sign-in for static mode"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          {mode !== "magic" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : mode === "magic" ? (
              <Mail className="h-4 w-4 mr-2" />
            ) : mode === "signup" ? (
              <User className="h-4 w-4 mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : "Send Magic Link"}
          </Button>

          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 uppercase">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <div className="flex gap-2">
            {mode !== "login" && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
              >
                Sign In
              </Button>
            )}
            {mode !== "signup" && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setSuccess("");
                }}
              >
                Sign Up
              </Button>
            )}
            {mode !== "magic" && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => {
                  setMode("magic");
                  setError("");
                  setSuccess("");
                }}
              >
                Magic Link
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
