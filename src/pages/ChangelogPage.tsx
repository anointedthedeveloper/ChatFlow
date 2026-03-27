import { MessageSquare, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const entries = [
  {
    version: "v1.3.0",
    date: "June 2025",
    tag: "New",
    tagColor: "bg-emerald-500/10 text-emerald-500",
    changes: [
      "Project Editor — open any project's linked repo in a full IDE with file tree, syntax highlighting, and commit support",
      "Pricing page with Free, Pro, and Enterprise plans",
      "Footer pages: Features, Changelog, Roadmap, About, Blog, Privacy, Terms",
      "Contact email wired to anointedthedeveloper@gmail.com",
    ],
  },
  {
    version: "v1.2.0",
    date: "May 2025",
    tag: "Improved",
    tagColor: "bg-sky-500/10 text-sky-500",
    changes: [
      "Workspace projects now support file imports from linked repos",
      "RepoFileBrowser: terminal tab, npm sandbox, and browser preview",
      "Split-view mode for code + preview side by side",
      "Branch switching in the file browser",
    ],
  },
  {
    version: "v1.1.0",
    date: "April 2025",
    tag: "Improved",
    tagColor: "bg-sky-500/10 text-sky-500",
    changes: [
      "Voice & video calls via WebRTC with STUN/TURN",
      "Screen sharing and self-preview picture-in-picture",
      "Voice notes recording and playback",
      "Push notifications and PWA app badge for unread count",
    ],
  },
  {
    version: "v1.0.0",
    date: "March 2025",
    tag: "Launch",
    tagColor: "bg-primary/10 text-primary",
    changes: [
      "Initial public release",
      "Real-time messaging with Supabase Realtime",
      "GitHub integration: link repos, browse files, create issues from messages",
      "Workspaces, channels, tasks, and projects",
      "Themes: Default, Ocean, Forest, Rose — dark & light mode",
    ],
  },
];

const ChangelogPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_22%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-6">
        <header className="flex items-center gap-3 mb-16">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl border border-border bg-card/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">RepoRoom</span>
          </Link>
        </header>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">Changelog</h1>
          <p className="text-muted-foreground">Every update, improvement, and fix — in one place.</p>
        </motion.div>

        <div className="space-y-10">
          {entries.map((entry, i) => (
            <motion.div key={entry.version} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.06 }}
              className="rounded-2xl border border-border/70 bg-card/50 p-6 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg font-bold text-foreground">{entry.version}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${entry.tagColor}`}>{entry.tag}</span>
                <span className="text-xs text-muted-foreground ml-auto">{entry.date}</span>
              </div>
              <ul className="space-y-2">
                {entry.changes.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <footer className="mt-16 text-center text-xs text-muted-foreground pb-8">
          &copy; {new Date().getFullYear()} RepoRoom. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default ChangelogPage;
