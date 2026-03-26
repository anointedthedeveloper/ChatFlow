import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  ChevronDown, ChevronRight, Copy, Download, Eye, ExternalLink, FileText, Folder, FolderOpen, 
  GitCommit, Maximize2, Menu, Minimize2, Pencil, Play, Save, TerminalSquare, X, 
  Files, Search, GitBranch, Settings, User, Bug, PlayCircle, Code2, Monitor, Info, Check, AlertCircle, FileCode, FileJson, FilePlus, FolderPlus, RefreshCw, MoreVertical, Layout, PanelLeft, PanelBottom, Sidebar
} from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import type { Language } from "prism-react-renderer";
import { useGithub } from "@/hooks/useGithub";
import type { WorkspaceProject } from "@/hooks/useWorkspace";
import { useThemeContext } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

interface TreeNode {
  path: string;
  name: string;
  type: "blob" | "tree";
  sha: string;
  url: string;
}

interface TreeResponse {
  tree?: Array<{ path: string; type: "blob" | "tree"; sha: string; url: string }>;
}

interface BranchResponse {
  name: string;
}

interface ContentResponse {
  content: string;
  sha: string;
}

interface ConsoleLine {
  id: string;
  kind: "info" | "stdout" | "stderr" | "input";
  text: string;
}

interface Tab {
  path: string;
  name: string;
  sha: string;
  content: string;
  editContent: string;
  isModified: boolean;
  loading: boolean;
}

interface Props {
  owner: string;
  repo: string;
  defaultBranch: string;
  projects?: WorkspaceProject[];
  onImportToProject?: (projectId: string, repoFullName: string, branchName: string, filePath: string, fileSha?: string | null) => Promise<void> | void;
  onClose: () => void;
}

const EXT_LANG: Record<string, Language> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
  py: "python",
  sql: "sql",
  yml: "yaml",
  yaml: "yaml",
};

const getFileIcon = (name: string, isOpen?: boolean) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (name === "package.json") return <FileJson className="h-4 w-4 text-[#cbcb41]" />;
  if (name === "tsconfig.json") return <FileJson className="h-4 w-4 text-[#3178c6]" />;
  if (ext === "ts" || ext === "tsx") return <FileCode className="h-4 w-4 text-[#3178c6]" />;
  if (ext === "js" || ext === "jsx") return <FileCode className="h-4 w-4 text-[#f7df1e]" />;
  if (ext === "html") return <Code2 className="h-4 w-4 text-[#e34f26]" />;
  if (ext === "css") return <Code2 className="h-4 w-4 text-[#1572b6]" />;
  if (ext === "json") return <FileJson className="h-4 w-4 text-[#cbcb41]" />;
  if (ext === "md") return <FileText className="h-4 w-4 text-[#007acc]" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const decodeGithubContent = (content: string) => decodeURIComponent(escape(atob(content.replace(/\n/g, ""))));

const markdownBlocks = (content: string) => {
  const lines = content.split("\n");
  return lines.map((line, index) => {
    if (!line.trim()) return <div key={`s-${index}`} className="h-2" />;
    if (line.startsWith("# ")) return <h1 key={index} className="text-3xl font-semibold mb-4 text-foreground">{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={index} className="text-2xl font-semibold mb-3 text-foreground">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={index} className="text-xl font-semibold mb-2 text-foreground">{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <li key={index} className="ml-5 list-disc mb-1 text-foreground/80">{line.slice(2)}</li>;
    if (line.startsWith("> ")) return <blockquote key={index} className="border-l-4 border-primary/50 pl-4 py-1 italic text-muted-foreground bg-muted/30 my-2 rounded-r">{line.slice(2)}</blockquote>;
    return <p key={index} className="whitespace-pre-wrap text-sm leading-7 text-foreground/90 mb-2">{line}</p>;
  });
};

const previewDoc = (path: string, content: string) => {
  if (/\.html?$/i.test(path)) {
    return `<!doctype html><html><head><meta charset="utf-8" /><script>const s=(k,a)=>parent.postMessage({source:"chatflow-preview",kind:k,args:a.map(String)},"*");console.log=(...a)=>s("stdout",a);console.error=(...a)=>s("stderr",a);console.warn=(...a)=>s("stderr",a);window.onerror=(m)=>s("stderr",[m]);</script></head><body>${content}</body></html>`;
  }
  if (/\.css$/i.test(path)) {
    return `<!doctype html><html><head><meta charset="utf-8" /><style>${content}</style></head><body style="font-family:system-ui;padding:24px"><div class="card"><h1>CSS Preview</h1><p>Stylesheet mounted in sandbox.</p><button>Button</button></div></body></html>`;
  }
  if (/\.(js|mjs)$/i.test(path)) {
    return `<!doctype html><html><head><meta charset="utf-8" /><script>const s=(k,a)=>parent.postMessage({source:"chatflow-preview",kind:k,args:a.map(String)},"*");console.log=(...a)=>s("stdout",a);console.error=(...a)=>s("stderr",a);console.warn=(...a)=>s("stderr",a);window.onerror=(m)=>s("stderr",[m]);</script></head><body><script>${content}</scr` + `ipt></body></html>`;
  }
  if (/\.json$/i.test(path)) {
    try {
      return `<!doctype html><html><body style="margin:0;background:#1e1e1e;color:#d4d4d4;padding:16px;font-family:ui-monospace,monospace"><pre>${JSON.stringify(JSON.parse(content), null, 2)}</pre></body></html>`;
    } catch {
      return "";
    }
  }
  return "";
};

const RepoFileBrowser = ({ owner, repo, defaultBranch, projects = [], onImportToProject, onClose }: Props) => {
  const { token, commitFile } = useGithub();
  const { mode } = useThemeContext();
  
  // Workspace State
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<string[]>([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"explorer" | "search" | "git">("explorer");
  const [showTerminal, setShowTerminal] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("code");
  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [consoleInput, setConsoleInput] = useState("");
  const [previewNonce, setPreviewNonce] = useState(0);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([
    { id: "boot", kind: "info", text: "Sandbox ready. Commands: help, run, preview, info, clear" },
  ]);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const activeTab = useMemo(() => tabs.find(t => t.path === activeTabPath), [tabs, activeTabPath]);

  const ghFetch = useCallback(async <T,>(url: string): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<T>;
  }, [token]);

  const pushConsole = (kind: ConsoleLine["kind"], text: string) => {
    setConsoleLines((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, kind, text }]);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      ghFetch<TreeResponse>(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`),
      ghFetch<BranchResponse[]>(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`),
    ]).then(([treeData, branchData]) => {
      setTree((treeData.tree || []).filter((node) => node.type === "blob" || node.type === "tree").map((node) => ({
        path: node.path,
        name: node.path.split("/").pop() || node.path,
        type: node.type,
        sha: node.sha,
        url: node.url,
      })));
      setBranches(branchData.map((item) => item.name));
    }).finally(() => setLoading(false));
  }, [owner, repo, branch, ghFetch]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLines]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { source?: string; kind?: "stdout" | "stderr"; args?: string[] };
      if (data.source !== "chatflow-preview" || !data.kind) return;
      pushConsole(data.kind, (data.args || []).join(" "));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const openFile = async (node: TreeNode) => {
    if (node.type !== "blob") return;
    
    // Check if already open
    const existingTab = tabs.find(t => t.path === node.path);
    if (existingTab) {
      setActiveTabPath(node.path);
      return;
    }

    const newTab: Tab = {
      path: node.path,
      name: node.name,
      sha: node.sha,
      content: "",
      editContent: "",
      isModified: false,
      loading: true
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabPath(node.path);

    try {
      const data = await ghFetch<ContentResponse>(`https://api.github.com/repos/${owner}/${repo}/contents/${node.path}?ref=${branch}`);
      const content = decodeGithubContent(data.content);
      
      setTabs(prev => prev.map(t => t.path === node.path ? {
        ...t,
        content,
        editContent: content,
        sha: data.sha,
        loading: false
      } : t));
      
      if (/README|\.md$/i.test(node.path)) {
        setViewMode("preview");
      }
      pushConsole("info", `Opened ${node.path}`);
    } catch {
      setTabs(prev => prev.map(t => t.path === node.path ? {
        ...t,
        content: "// Could not load file",
        editContent: "// Could not load file",
        loading: false
      } : t));
      pushConsole("stderr", `Could not load ${node.path}`);
    }
  };

  const closeTab = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const tabIndex = tabs.findIndex(t => t.path === path);
    const newTabs = tabs.filter(t => t.path !== path);
    setTabs(newTabs);
    
    if (activeTabPath === path) {
      if (newTabs.length > 0) {
        const nextTab = newTabs[Math.min(tabIndex, newTabs.length - 1)];
        setActiveTabPath(nextTab.path);
      } else {
        setActiveTabPath(null);
      }
    }
  };

  const updateActiveTabContent = (value: string) => {
    if (!activeTabPath) return;
    setTabs(prev => prev.map(t => t.path === activeTabPath ? {
      ...t,
      editContent: value,
      isModified: value !== t.content
    } : t));
  };

  const runFile = () => {
    if (!activeTab) {
      pushConsole("stderr", "No file selected.");
      return;
    }
    pushConsole("input", `run ${activeTab.path}`);
    if (/\.md$/i.test(activeTab.path)) {
      setViewMode("preview");
      pushConsole("info", "Markdown preview updated.");
      return;
    }
    if (/\.(html|css|js|mjs|json)$/i.test(activeTab.path)) {
      setViewMode("split");
      setPreviewNonce((value) => value + 1);
      if (/\.json$/i.test(activeTab.path)) {
        try {
          const parsed = JSON.parse(activeTab.editContent);
          pushConsole("stdout", `JSON valid with ${Object.keys(parsed).length} top-level key(s).`);
        } catch (error) {
          pushConsole("stderr", `JSON parse error: ${(error as Error).message}`);
        }
      } else {
        pushConsole("info", `Rendered sandbox preview for ${activeTab.path}`);
      }
      return;
    }
    pushConsole("stderr", "This file type needs a backend runtime/compiler. The current sandbox supports markdown and web files only.");
  };

  const handleCommit = async () => {
    if (!activeTab || !commitMsg.trim() || !token) return;
    setCommitting(true);
    const ok = await commitFile(owner, repo, activeTab.path, activeTab.editContent, commitMsg.trim(), activeTab.sha, branch);
    if (ok) {
      setTabs(prev => prev.map(t => t.path === activeTab.path ? {
        ...t,
        content: t.editContent,
        isModified: false
      } : t));
      setCommitMsg("");
      pushConsole("info", `Committed ${activeTab.path} to ${branch}`);
    } else {
      pushConsole("stderr", "Commit failed. Check GitHub permissions.");
    }
    setCommitting(false);
  };

  const runConsoleCommand = () => {
    const command = consoleInput.trim();
    if (!command) return;
    pushConsole("input", command);
    setConsoleInput("");
    if (command === "help") {
      ["help", "run", "preview", "info", "clear"].forEach((item) => pushConsole("info", item));
      return;
    }
    if (command === "clear") {
      setConsoleLines([]);
      return;
    }
    if (command === "run") {
      runFile();
      return;
    }
    if (command === "preview") {
      setPreviewNonce((value) => value + 1);
      pushConsole("info", "Preview reloaded.");
      return;
    }
    if (command === "info") {
      pushConsole("info", `${owner}/${repo} on ${branch}`);
      pushConsole("info", activeTab ? activeTab.path : "No file selected");
      return;
    }
    pushConsole("stderr", `Unknown command: ${command}`);
  };

  const getChildren = (parentPath: string) => tree.filter((node) => {
    if (parentPath === "root") {
      return !node.path.includes("/");
    }
    const relative = node.path.slice(parentPath.length + 1);
    return node.path.startsWith(`${parentPath}/`) && !relative.includes("/");
  });

  const renderTree = (parentPath = "root", depth = 0): React.ReactNode => getChildren(parentPath).map((node) => {
    const isOpen = expanded.has(node.path);
    const isActive = activeTabPath === node.path;
    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === "tree") {
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              });
            } else {
              void openFile(node);
            }
          }}
          className={cn(
            "w-full flex items-center gap-2 py-1 px-2 text-left hover:bg-muted/50 transition-colors group",
            isActive ? "bg-primary/10 text-primary border-r-2 border-primary" : "text-foreground/70"
          )}
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
        >
          {node.type === "tree" ? (
            <>
              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              {isOpen ? <FolderOpen className="h-4 w-4 text-blue-400 shrink-0" /> : <Folder className="h-4 w-4 text-blue-400 shrink-0" />}
            </>
          ) : (
            <>
              <span className="w-4" />
              {getFileIcon(node.name)}
            </>
          )}
          <span className="truncate text-[13px]">{node.name}</span>
        </button>
        {node.type === "tree" && isOpen && renderTree(node.path, depth + 1)}
      </div>
    );
  });

  const editorTheme = mode === "light" ? themes.github : themes.nightOwl;
  const isDark = mode === "dark";

  return (
    <div className={cn(
      "flex flex-col overflow-hidden bg-[#1e1e1e] text-[#d4d4d4] font-sans selection:bg-primary/30",
      fullscreen ? "fixed inset-0 z-50" : "h-full w-[1100px] border-l border-border"
    )}>
      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-4 gap-4 shrink-0 border-r border-white/5">
          <button 
            onClick={() => { setActiveSidebarTab("explorer"); setShowSidebar(true); }}
            className={cn("p-2 transition-colors", activeSidebarTab === "explorer" && showSidebar ? "text-white" : "text-white/40 hover:text-white/70")}
          >
            <Files className="h-6 w-6" />
          </button>
          <button 
            onClick={() => { setActiveSidebarTab("search"); setShowSidebar(true); }}
            className={cn("p-2 transition-colors", activeSidebarTab === "search" && showSidebar ? "text-white" : "text-white/40 hover:text-white/70")}
          >
            <Search className="h-6 w-6" />
          </button>
          <button 
            onClick={() => { setActiveSidebarTab("git"); setShowSidebar(true); }}
            className={cn("p-2 transition-colors", activeSidebarTab === "git" && showSidebar ? "text-white" : "text-white/40 hover:text-white/70")}
          >
            <GitBranch className="h-6 w-6" />
          </button>
          <div className="mt-auto flex flex-col gap-4 mb-2">
            <button className="p-2 text-white/40 hover:text-white/70"><User className="h-6 w-6" /></button>
            <button className="p-2 text-white/40 hover:text-white/70"><Settings className="h-6 w-6" /></button>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-[#252526] border-r border-white/5 flex flex-col shrink-0"
            >
              <div className="h-9 flex items-center justify-between px-4 text-[11px] uppercase tracking-wider text-white/50 font-semibold">
                <span>{activeSidebarTab}</span>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-white/10 rounded"><RefreshCw className="h-3 w-3" /></button>
                  <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-white/10 rounded"><X className="h-3 w-3" /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {activeSidebarTab === "explorer" && (
                  <div className="py-2">
                    <div className="px-4 py-1 flex items-center justify-between group">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-white/70">
                        <ChevronDown className="h-4 w-4" />
                        <span>{repo.toUpperCase()}</span>
                      </div>
                      <div className="hidden group-hover:flex gap-1">
                        <button className="p-1 hover:bg-white/10 rounded"><FilePlus className="h-3 w-3" /></button>
                        <button className="p-1 hover:bg-white/10 rounded"><FolderPlus className="h-3 w-3" /></button>
                      </div>
                    </div>
                    {loading ? (
                      <div className="p-4 flex flex-col gap-2">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 bg-white/5 animate-pulse rounded w-full" />)}
                      </div>
                    ) : (
                      renderTree()
                    )}
                  </div>
                )}

                {activeSidebarTab === "git" && (
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-[11px] text-white/50 uppercase font-bold">Source Control</p>
                      <div className="bg-white/5 border border-white/10 rounded p-2 text-xs">
                        {tabs.filter(t => t.isModified).length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-white/70">{tabs.filter(t => t.isModified).length} files pending commit</p>
                            <textarea 
                              value={commitMsg}
                              onChange={(e) => setCommitMsg(e.target.value)}
                              placeholder="Commit message..."
                              className="w-full bg-[#1e1e1e] border border-white/10 rounded p-2 text-white outline-none focus:border-primary/50 resize-none h-20"
                            />
                            <button 
                              onClick={handleCommit}
                              disabled={committing || !commitMsg.trim()}
                              className="w-full bg-primary hover:bg-primary/90 text-white py-1.5 rounded flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {committing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GitCommit className="h-4 w-4" />}
                              Commit to {branch}
                            </button>
                          </div>
                        ) : (
                          <p className="text-white/40 italic">No changes detected</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Branch Selector at bottom of sidebar */}
              <div className="mt-auto border-t border-white/5 p-2">
                <select 
                  value={branch} 
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-[#1e1e1e] text-[11px] text-white/70 border border-white/10 rounded px-2 py-1 outline-none"
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Tab Bar */}
          <div className="h-9 bg-[#252526] flex overflow-x-auto scrollbar-hide border-b border-white/5">
            {tabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabPath(tab.path)}
                className={cn(
                  "group flex items-center gap-2 px-3 py-1.5 border-r border-white/5 cursor-pointer min-w-[120px] max-w-[200px] transition-colors relative",
                  activeTabPath === tab.path ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d2d] text-white/40 hover:bg-[#2a2a2a] hover:text-white/70"
                )}
              >
                {activeTabPath === tab.path && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />}
                {getFileIcon(tab.name)}
                <span className={cn("text-xs truncate flex-1", tab.isModified && "italic")}>{tab.name}{tab.isModified ? "*" : ""}</span>
                <button 
                  onClick={(e) => closeTab(tab.path, e)}
                  className="p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Breadcrumbs */}
          {activeTab && (
            <div className="h-6 flex items-center px-4 text-[11px] text-white/40 gap-1 bg-[#1e1e1e]">
              <span>{owner}</span>
              <ChevronRight className="h-3 w-3" />
              <span>{repo}</span>
              <ChevronRight className="h-3 w-3" />
              {activeTab.path.split("/").map((part, i, arr) => (
                <div key={part} className="flex items-center gap-1">
                  <span>{part}</span>
                  {i < arr.length - 1 && <ChevronRight className="h-3 w-3" />}
                </div>
              ))}
              <div className="ml-auto flex items-center gap-3">
                <button onClick={runFile} className="hover:text-primary flex items-center gap-1 transition-colors">
                  <Play className="h-3 w-3 fill-current" />
                  <span>Run</span>
                </button>
                <div className="flex bg-white/5 rounded p-0.5 border border-white/10">
                  <button onClick={() => setViewMode("code")} className={cn("p-1 rounded", viewMode === "code" ? "bg-white/10 text-white" : "hover:text-white")} title="Code"><Code2 className="h-3 w-3" /></button>
                  <button onClick={() => setViewMode("split")} className={cn("p-1 rounded", viewMode === "split" ? "bg-white/10 text-white" : "hover:text-white")} title="Split View"><Layout className="h-3 w-3" /></button>
                  <button onClick={() => setViewMode("preview")} className={cn("p-1 rounded", viewMode === "preview" ? "bg-white/10 text-white" : "hover:text-white")} title="Preview"><Eye className="h-3 w-3" /></button>
                </div>
                <button onClick={() => setFullscreen(!fullscreen)} className="hover:text-white transition-colors">
                  {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </button>
                <button onClick={onClose} className="hover:text-rose-400 transition-colors"><X className="h-3 w-3" /></button>
              </div>
            </div>
          )}

          {/* Editor/Preview Surface */}
          <div className="flex-1 flex overflow-hidden relative">
            <PanelGroup direction="vertical">
              <Panel defaultSize={70} minSize={20}>
                <div className="h-full flex overflow-hidden">
                  {activeTab ? (
                    <>
                      {/* Code Editor */}
                      {(viewMode === "code" || viewMode === "split") && (
                        <div className={cn("relative flex-1 flex overflow-hidden bg-[#1e1e1e]", viewMode === "split" && "border-r border-white/10")}>
                          {activeTab.loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1e1e1e] z-10">
                              <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                              <span className="text-xs text-white/40">Loading file...</span>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-auto flex">
                              <Highlight
                                theme={editorTheme}
                                code={activeTab.editContent}
                                language={EXT_LANG[activeTab.name.split(".").pop() || ""] || "text"}
                              >
                                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                                  <pre className={cn(className, "flex-1 m-0 p-4 font-mono text-[13px] outline-none min-w-full")} style={{ ...style, backgroundColor: "transparent" }}>
                                    <textarea
                                      value={activeTab.editContent}
                                      onChange={(e) => updateActiveTabContent(e.target.value)}
                                      className="absolute inset-0 w-full h-full p-4 pl-[3.5rem] bg-transparent text-transparent caret-white resize-none outline-none font-mono text-[13px] leading-6 z-10"
                                      spellCheck={false}
                                    />
                                    {tokens.map((line, i) => (
                                      <div key={i} {...getLineProps({ line, key: i })} className="flex leading-6">
                                        <span className="w-10 text-right pr-4 select-none opacity-20 text-[11px] shrink-0">{i + 1}</span>
                                        <span className="flex-1">
                                          {line.map((token, key) => (
                                            <span key={key} {...getTokenProps({ token, key })} />
                                          ))}
                                        </span>
                                      </div>
                                    ))}
                                  </pre>
                                )}
                              </Highlight>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Preview Panel */}
                      {(viewMode === "preview" || viewMode === "split") && (
                        <div className="flex-1 overflow-auto bg-[#ffffff] text-[#333333]">
                          {/\.md$/i.test(activeTab.path) ? (
                            <div className="max-w-4xl mx-auto px-10 py-10 prose prose-slate dark:prose-invert">
                              {markdownBlocks(activeTab.editContent)}
                            </div>
                          ) : previewDoc(activeTab.path, activeTab.editContent) ? (
                            <iframe 
                              key={`${activeTab.path}-${previewNonce}`} 
                              title="Preview" 
                              sandbox="allow-scripts" 
                              className="w-full h-full border-0" 
                              srcDoc={previewDoc(activeTab.path, activeTab.editContent)} 
                            />
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-[#252526] text-white/40">
                              <Info className="h-10 w-10 mb-4 opacity-20" />
                              <p className="text-sm">No preview available for this file type.</p>
                              <p className="text-[11px] mt-2">Only Markdown, HTML, CSS, JS, and JSON can be previewed in the sandbox.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                      <div className="relative">
                        <Code2 className="h-20 w-20 text-white/5" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="h-12 w-12 text-white/10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                        </div>
                      </div>
                      <div className="max-w-xs space-y-1">
                        <p className="text-sm font-medium text-white/80">Welcome to ChatFlow IDE</p>
                        <p className="text-[11px] text-white/40">Select a file from the explorer to start editing. You can run code, preview markdown, and commit changes directly.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-white/30 pt-4">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                          <span>Syntax Highlighting</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
                          <span>Direct Commits</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
                          <span>Sandbox Preview</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400/50" />
                          <span>Terminal Console</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
              
              {showTerminal && (
                <>
                  <PanelResizeHandle className="h-1 bg-white/5 hover:bg-primary/50 transition-colors cursor-row-resize" />
                  <Panel defaultSize={30} minSize={10}>
                    <div className="h-full bg-[#1e1e1e] flex flex-col border-t border-white/5">
                      <div className="h-9 flex items-center px-4 gap-4 border-b border-white/5">
                        <button className="text-[11px] font-bold uppercase tracking-wider text-white border-b-2 border-primary py-2">Terminal</button>
                        <button className="text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white/60 py-2">Debug Console</button>
                        <button className="text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white/60 py-2">Output</button>
                        <div className="ml-auto flex items-center gap-2">
                          <button onClick={() => setConsoleLines([])} className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white/70" title="Clear Console"><RefreshCw className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setShowTerminal(false)} className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white/70"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs space-y-1">
                        {consoleLines.map((line) => (
                          <div key={line.id} className={cn(
                            "flex gap-2",
                            line.kind === "stderr" ? "text-rose-400" : 
                            line.kind === "stdout" ? "text-emerald-400" : 
                            line.kind === "input" ? "text-sky-400" : "text-white/60"
                          )}>
                            {line.kind === "input" && <span className="opacity-50">&gt;</span>}
                            <span>{line.text}</span>
                          </div>
                        ))}
                        <div ref={consoleEndRef} />
                      </div>
                      <div className="p-2 px-4 border-t border-white/5 flex items-center gap-2">
                        <span className="text-sky-400 font-mono text-xs">$</span>
                        <input 
                          value={consoleInput} 
                          onChange={(e) => setConsoleInput(e.target.value)} 
                          onKeyDown={(e) => e.key === "Enter" && runConsoleCommand()} 
                          placeholder="Type command (help, run, preview, clear)..."
                          className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-white/80"
                        />
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </div>

          {/* Status Bar */}
          <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 hover:bg-white/10 px-1 cursor-pointer">
                <GitBranch className="h-3 w-3" />
                <span>{branch}</span>
                <Check className="h-3 w-3" />
              </div>
              <div className="flex items-center gap-1 hover:bg-white/10 px-1 cursor-pointer">
                <RefreshCw className="h-3 w-3" />
              </div>
              <div className="flex items-center gap-1 hover:bg-white/10 px-1 cursor-pointer">
                <AlertCircle className="h-3 w-3" />
                <span>0</span>
                <Bug className="h-3 w-3" />
                <span>0</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {activeTab && (
                <>
                  <span className="hover:bg-white/10 px-1 cursor-pointer">Spaces: 2</span>
                  <span className="hover:bg-white/10 px-1 cursor-pointer">UTF-8</span>
                  <span className="hover:bg-white/10 px-1 cursor-pointer capitalize">{EXT_LANG[activeTab.name.split(".").pop() || ""] || "Plain Text"}</span>
                  <div className="flex items-center gap-1 hover:bg-white/10 px-1 cursor-pointer">
                    <Monitor className="h-3 w-3" />
                    <span>Go Live</span>
                  </div>
                  <div className="flex items-center gap-1 hover:bg-white/10 px-1 cursor-pointer">
                    <Check className="h-3 w-3" />
                    <span>Prettier</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-1 hover:bg-white/10 px-1 cursor-pointer" onClick={() => setShowTerminal(!showTerminal)}>
                <PanelBottom className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoFileBrowser;
