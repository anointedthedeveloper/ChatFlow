import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ArrowRight, UserPlus, Shield, Sparkles, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";

type View = "signin" | "signup" | "forgot" | "forgot-sent";

const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<View>(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  const reset = (v: View) => {
    setView(v);
    setError("");
    setSearchParams(v === "signup" ? { mode: "signup" } : {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (view === "signup") {
        if (!username.trim()) { setError("Username is required"); return; }
        const { error } = await signUp(email, password, username);
        if (error) setError(error.message);
      } else if (view === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else if (view === "forgot") {
        const { error } = await resetPassword(email);
        if (error) setError(error.message);
        else setView("forgot-sent");
      }
    } finally {
      setLoading(false);
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.12),_transparent_26%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-[140px]" />
      <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-accent/10 blur-[110px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">

          {/* Left panel */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {view === "signup" ? "Join the workspace" : view === "forgot" || view === "forgot-sent" ? "Account recovery" : "Welcome back"}
              </div>
              <h1 className="text-5xl font-semibold tracking-tight text-foreground">
                Workspace chat that actually connects to the way teams ship.
              </h1>
              <p className="mt-5 text-base leading-8 text-muted-foreground">
                Sign in to jump back into chats, GitHub-linked projects, and your in-app workspace tools.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Linked repos and project-aware file imports",
                  "Chat-to-issue workflow for faster triage",
                  "IDE surfaces that live beside your collaboration flow",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/65 px-4 py-3 backdrop-blur-xl">
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — auth card */}
          <div className="relative z-10 w-full max-w-md justify-self-center">
            <div className="rounded-[30px] border border-border/70 bg-card/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-8">

              {/* Logo */}
              <div className="mb-8 flex flex-col items-center text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
                  <MessageSquare className="h-8 w-8 text-primary-foreground" />
                </motion.div>
                <h1 className="text-3xl font-semibold text-foreground">RepoRoom</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {view === "signup" && "Create your account and step into the workspace."}
                  {view === "signin" && "Sign in and continue where your team left off."}
                  {view === "forgot" && "Enter your email and we'll send a reset link."}
                  {view === "forgot-sent" && "Check your inbox for the reset link."}
                </p>
              </div>

              <AnimatePresence mode="wait">

                {/* ── Forgot sent confirmation ── */}
                {view === "forgot-sent" && (
                  <motion.div key="sent" {...cardVariants} className="text-center space-y-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">Reset link sent!</p>
                      <p className="text-xs text-muted-foreground leading-5">
                        We sent a password reset link to <span className="text-foreground font-medium">{email}</span>. Check your inbox and follow the link to set a new password.
                      </p>
                    </div>
                    <button onClick={() => reset("signin")}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background/80 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                      <ArrowLeft className="h-4 w-4" /> Back to sign in
                    </button>
                  </motion.div>
                )}

                {/* ── Forgot password form ── */}
                {view === "forgot" && (
                  <motion.form key="forgot" {...cardVariants} onSubmit={handleSubmit} className="space-y-3">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your account email"
                      className="w-full bg-muted text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                      required autoFocus
                    />
                    {error && <p className="text-xs text-destructive text-center">{error}</p>}
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="submit" disabled={loading}
                      className="w-full gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity">
                      {loading ? "Sending…" : "Send reset link"}
                      {!loading && <Mail className="h-4 w-4" />}
                    </motion.button>
                    <button type="button" onClick={() => reset("signin")}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors">
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                    </button>
                  </motion.form>
                )}

                {/* ── Sign in / Sign up form ── */}
                {(view === "signin" || view === "signup") && (
                  <motion.form key={view} {...cardVariants} onSubmit={handleSubmit} className="space-y-3">
                    {view === "signup" && (
                      <input value={username} onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full bg-muted text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                      />
                    )}
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full bg-muted text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                      required
                    />
                    <div className="space-y-1">
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-muted text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                        required minLength={6}
                      />
                      {view === "signin" && (
                        <div className="flex justify-end">
                          <button type="button" onClick={() => reset("forgot")}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors pr-1">
                            Forgot password?
                          </button>
                        </div>
                      )}
                    </div>

                    {error && <p className="text-xs text-destructive text-center">{error}</p>}

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="submit" disabled={loading}
                      className="w-full gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity">
                      {loading ? "…" : view === "signup" ? "Create Account" : "Sign In"}
                      {!loading && (view === "signup" ? <UserPlus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
                    </motion.button>

                    <button type="button" onClick={() => reset(view === "signin" ? "signup" : "signin")}
                      className="w-full text-center text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors">
                      {view === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="mt-6 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors">Back to home</Link>
                <span>Built for collaborative shipping</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
