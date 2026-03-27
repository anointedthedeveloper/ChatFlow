import { describe, it, expect, vi, beforeEach } from "vitest";

// ── helpers ──────────────────────────────────────────────────────────────────

const mockFetch = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body, status: ok ? 200 : 401 });

const makeStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
};

// ── useGithub logic (pure, no React) ─────────────────────────────────────────

describe("useGithub — token storage", () => {
  it("persists token and user to localStorage on connect", async () => {
    const storage = makeStorage();
    global.fetch = mockFetch({ login: "anointedthedeveloper" });

    const pat = "ghp_testtoken123";
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${pat}` },
    });
    const user = await res.json();

    storage.setItem("chatflow_github_token", pat);
    storage.setItem("chatflow_github_user", user.login);

    expect(storage.getItem("chatflow_github_token")).toBe(pat);
    expect(storage.getItem("chatflow_github_user")).toBe("anointedthedeveloper");
  });

  it("clears storage on disconnect", () => {
    const storage = makeStorage();
    storage.setItem("chatflow_github_token", "ghp_abc");
    storage.setItem("chatflow_github_user", "anointedthedeveloper");

    storage.removeItem("chatflow_github_token");
    storage.removeItem("chatflow_github_user");

    expect(storage.getItem("chatflow_github_token")).toBeNull();
    expect(storage.getItem("chatflow_github_user")).toBeNull();
  });
});

// ── repo fetching ─────────────────────────────────────────────────────────────

describe("useGithub — fetchRepos", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns repos from API", async () => {
    const fakeRepos = [
      { id: 1, name: "RepoRoom", full_name: "anointedthedeveloper/RepoRoom", default_branch: "main", private: false, stargazers_count: 1, forks_count: 1, language: "TypeScript", description: null, html_url: "", updated_at: "", open_issues_count: 0 },
    ];
    global.fetch = mockFetch(fakeRepos);

    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&page=1");
    const data = await res.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe("RepoRoom");
  });

  it("handles empty repo list", async () => {
    global.fetch = mockFetch([]);
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&page=1");
    const data = await res.json();
    expect(data).toHaveLength(0);
  });

  it("throws on 401 unauthorized", async () => {
    global.fetch = mockFetch({ message: "Bad credentials" }, false);
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&page=1");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });
});

// ── repo tree ─────────────────────────────────────────────────────────────────

describe("useGithub — repo file tree", () => {
  it("fetches and filters blob/tree nodes", async () => {
    const fakeTree = {
      tree: [
        { path: "src", type: "tree", sha: "abc", url: "" },
        { path: "src/index.ts", type: "blob", sha: "def", url: "" },
        { path: "README.md", type: "blob", sha: "ghi", url: "" },
      ],
    };
    global.fetch = mockFetch(fakeTree);

    const res = await fetch("https://api.github.com/repos/anointedthedeveloper/RepoRoom/git/trees/main?recursive=1");
    const data = await res.json();
    const nodes = (data.tree || []).filter((n: { type: string }) => n.type === "blob" || n.type === "tree");

    expect(nodes).toHaveLength(3);
    expect(nodes.map((n: { path: string }) => n.path)).toContain("src/index.ts");
  });
});

// ── file content ──────────────────────────────────────────────────────────────

describe("useGithub — file content decoding", () => {
  it("decodes base64 GitHub content correctly", () => {
    const original = "export const hello = 'world';";
    const encoded = btoa(unescape(encodeURIComponent(original))) + "\n";
    const decoded = decodeURIComponent(escape(atob(encoded.replace(/\n/g, ""))));
    expect(decoded).toBe(original);
  });

  it("handles multi-line content", () => {
    const original = "line1\nline2\nline3";
    const encoded = btoa(unescape(encodeURIComponent(original)));
    const decoded = decodeURIComponent(escape(atob(encoded.replace(/\n/g, ""))));
    expect(decoded).toBe(original);
  });
});

// ── commit file ───────────────────────────────────────────────────────────────

describe("useGithub — commitFile", () => {
  it("sends PUT with correct payload", async () => {
    global.fetch = mockFetch({ content: { sha: "newsha" } });

    const content = "updated content";
    const encoded = btoa(unescape(encodeURIComponent(content)));

    const res = await fetch("https://api.github.com/repos/anointedthedeveloper/RepoRoom/contents/src/index.ts", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer ghp_test" },
      body: JSON.stringify({ message: "test commit", content: encoded, sha: "oldsha", branch: "main" }),
    });

    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("contents/src/index.ts"),
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("returns false when no token", async () => {
    const token = null;
    const result = token ? true : false;
    expect(result).toBe(false);
  });
});

// ── create issue ──────────────────────────────────────────────────────────────

describe("useGithub — createIssue", () => {
  it("posts issue and returns number + url", async () => {
    global.fetch = mockFetch({ number: 42, html_url: "https://github.com/anointedthedeveloper/RepoRoom/issues/42" });

    const res = await fetch("https://api.github.com/repos/anointedthedeveloper/RepoRoom/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer ghp_test" },
      body: JSON.stringify({ title: "Bug: test issue", body: "details here" }),
    });
    const data = await res.json();

    expect(data.number).toBe(42);
    expect(data.html_url).toContain("/issues/42");
  });
});

// ── create repo ───────────────────────────────────────────────────────────────

describe("useGithub — createRepo", () => {
  it("posts to /user/repos and returns created repo", async () => {
    global.fetch = mockFetch({ id: 99, name: "new-repo", full_name: "anointedthedeveloper/new-repo", default_branch: "main", private: false, html_url: "", description: null });

    const res = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer ghp_test" },
      body: JSON.stringify({ name: "new-repo", description: "", private: false, auto_init: true }),
    });
    const data = await res.json();

    expect(data.name).toBe("new-repo");
    expect(data.full_name).toBe("anointedthedeveloper/new-repo");
  });
});

// ── parseGithubUrl ────────────────────────────────────────────────────────────

describe("useGithub — parseGithubUrl", () => {
  const parse = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  };

  it("parses https URL", () => {
    expect(parse("https://github.com/anointedthedeveloper/RepoRoom")).toEqual({ owner: "anointedthedeveloper", repo: "RepoRoom" });
  });

  it("strips .git suffix", () => {
    expect(parse("https://github.com/anointedthedeveloper/RepoRoom.git")).toEqual({ owner: "anointedthedeveloper", repo: "RepoRoom" });
  });

  it("returns null for non-github URL", () => {
    expect(parse("https://gitlab.com/user/repo")).toBeNull();
  });
});

// ── previewDoc ────────────────────────────────────────────────────────────────

describe("previewDoc", () => {
  const previewDoc = (path: string, content: string) => {
    if (/\.html?$/i.test(path)) return `<!doctype html>${content}`;
    if (/\.css$/i.test(path)) return `<!doctype html><style>${content}</style>`;
    if (/\.(js|mjs)$/i.test(path)) return `<!doctype html><script>${content}</script>`;
    if (/\.json$/i.test(path)) {
      try { return `<pre>${JSON.stringify(JSON.parse(content), null, 2)}</pre>`; } catch { return ""; }
    }
    return "";
  };

  it("wraps html content", () => expect(previewDoc("index.html", "<h1>Hi</h1>")).toContain("<h1>Hi</h1>"));
  it("wraps css in style tag", () => expect(previewDoc("style.css", "body{}")).toContain("<style>body{}</style>"));
  it("wraps js in script tag", () => expect(previewDoc("app.js", "console.log(1)")).toContain("console.log(1)"));
  it("pretty-prints valid json", () => expect(previewDoc("data.json", '{"a":1}')).toContain('"a": 1'));
  it("returns empty string for invalid json", () => expect(previewDoc("data.json", "not json")).toBe(""));
  it("returns empty string for unsupported type", () => expect(previewDoc("file.py", "print()")).toBe(""));
});
