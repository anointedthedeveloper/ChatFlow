import { motion } from "framer-motion";

const PageLoader = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-16 w-16 rounded-3xl overflow-hidden shadow-[0_20px_50px_hsl(var(--primary)/0.35)]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" className="h-full w-full">
        <rect width="100" height="100" rx="22" fill="#0f1117"/>
        <rect x="8" y="14" width="78" height="68" rx="10" fill="#1c2030" stroke="#2a2f42" strokeWidth="1.5"/>
        <rect x="8" y="14" width="78" height="22" rx="10" fill="#252a3d"/>
        <rect x="8" y="26" width="78" height="10" fill="#252a3d"/>
        <circle cx="24" cy="25" r="5.5" fill="#ff5f57"/>
        <circle cx="40" cy="25" r="5.5" fill="#febc2e"/>
        <circle cx="56" cy="25" r="5.5" fill="#27c840"/>
        <path d="M18 52 L30 61 L18 70" stroke="#4d9ef7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M68 52 L56 61 L68 70" stroke="#4d9ef7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="51" y1="48" x2="40" y2="74" stroke="#27c840" strokeWidth="6" strokeLinecap="round"/>
      </svg>
    </motion.div>
    <div className="mt-6 flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
    <p className="mt-3 text-xs font-medium tracking-widest uppercase text-muted-foreground">RepoRoom</p>
  </div>
);

export default PageLoader;
