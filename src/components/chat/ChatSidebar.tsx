import { useState, useEffect, useRef } from "react";
import { Search, MessageSquarePlus, Users, Settings, X, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import AvatarBubble from "./AvatarBubble";
import ThemeToggle from "./ThemeToggle";
import ProfileSettings from "./ProfileSettings";
import type { EnrichedChatRoom } from "@/hooks/useChat";

interface ChatSidebarProps {
  chats: EnrichedChatRoom[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onCreateDM: (userId: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
}

const formatTimestamp = (dateStr?: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const ChatSidebar = ({ chats, activeChatId, onSelectChat, onCreateDM, onCreateGroup }: ChatSidebarProps) => {
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupNameError, setGroupNameError] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut } = useAuth();

  // Load users for new chat panel
  useEffect(() => {
    if (showNewChat) {
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, status")
        .neq("id", user?.id || "")
        .then(({ data }) => {
          if (data) setAllUsers(data as UserProfile[]);
        });
    }
  }, [showNewChat, user]);

  // Global search — searches users by username/display_name
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, status")
        .neq("id", user?.id || "")
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(8);
      setSearchResults(data as UserProfile[] || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user]);

  // Close search results on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ?? false)
  );

  const filteredChats = search.trim()
    ? chats.filter((c) => c.displayName.toLowerCase().includes(search.toLowerCase()))
    : chats;

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-sidebar-border">
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <AvatarBubble
            letter={profile?.username?.[0]?.toUpperCase() || "A"}
            status="online"
            size="sm"
            imageUrl={profile?.avatar_url}
          />
          <div className="text-left">
            <p className="text-sm font-semibold text-sidebar-foreground leading-tight">
              {profile?.display_name || profile?.username || "You"}
            </p>
            <p className="text-[10px] text-online font-medium">Online</p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setShowProfile(true)}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setShowNewChat(!showNewChat); setSearch(""); }}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New Chat Panel */}
      {showNewChat && (
        <div className="px-3 py-2 border-b border-sidebar-border space-y-2 bg-sidebar-accent/20">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <button
                onClick={() => setIsGroupMode(false)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${!isGroupMode ? "gradient-primary text-primary-foreground" : "bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"}`}
              >
                Direct
              </button>
              <button
                onClick={() => setIsGroupMode(true)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${isGroupMode ? "gradient-primary text-primary-foreground" : "bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"}`}
              >
                <Users className="h-3 w-3" />Group
              </button>
            </div>
            <button onClick={() => setShowNewChat(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search users..."
            autoFocus
            className="w-full bg-sidebar-accent/50 text-xs text-sidebar-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary transition-all"
          />

          {isGroupMode && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (required)..."
              className="w-full bg-sidebar-accent/50 text-xs text-sidebar-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
            />
          )}

          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  if (isGroupMode) {
                    setSelectedMembers((prev) =>
                      prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                    );
                  } else {
                    onCreateDM(u.id);
                    setShowNewChat(false);
                    setUserSearch("");
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-sidebar-accent/60 ${selectedMembers.includes(u.id) ? "bg-primary/20 ring-1 ring-primary/30" : ""}`}
              >
                <AvatarBubble letter={u.username[0]?.toUpperCase() || "?"} status={u.status as "online" | "offline"} size="sm" imageUrl={u.avatar_url} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-sidebar-foreground truncate">{u.display_name || u.username}</span>
                  <span className="text-[10px] text-muted-foreground">@{u.username}</span>
                </div>
                {selectedMembers.includes(u.id) && (
                  <div className="ml-auto h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-[8px] text-white font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {userSearch ? `No users found for "${userSearch}"` : "No other users yet"}
              </p>
            )}
          </div>

          {isGroupMode && selectedMembers.length > 0 && (
            <button
              onClick={() => {
                if (!groupName.trim()) {
                  setGroupNameError(true);
                  return;
                }
                setGroupNameError(false);
                onCreateGroup(groupName, selectedMembers);
                setShowNewChat(false);
                setGroupName("");
                setSelectedMembers([]);
                setUserSearch("");
              }}
              className="w-full text-xs gradient-primary text-primary-foreground rounded-lg py-2 font-semibold"
            >
              {groupNameError
                ? "⚠ Enter a group name first"
                : `Create Group · ${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}

      {/* Search bar with user results dropdown */}
      <div className="px-3 py-2" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats or users..."
            className="w-full bg-sidebar-accent/50 text-sm text-sidebar-foreground placeholder:text-muted-foreground rounded-xl pl-9 pr-8 py-2 outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {search && (
            <button onClick={() => { setSearch(""); setSearchResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* User search results dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10">
            <p className="text-[10px] text-muted-foreground px-3 pt-2 pb-1 font-medium uppercase tracking-wide">Users</p>
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onCreateDM(u.id);
                  setSearch("");
                  setSearchResults([]);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left"
              >
                <AvatarBubble letter={u.username[0]?.toUpperCase() || "?"} status={u.status as "online" | "offline"} size="sm" imageUrl={u.avatar_url} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</span>
                  <span className="text-[11px] text-muted-foreground">@{u.username} · {u.status === "online" ? "🟢 Online" : "⚫ Offline"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {searching && search && (
          <p className="text-xs text-muted-foreground text-center py-2">Searching...</p>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 && !search && (
          <div className="px-4 py-10 text-center">
            <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3 opacity-50">
              <MessageSquarePlus className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">No chats yet.<br />Start a new conversation!</p>
          </div>
        )}
        {filteredChats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-sidebar-accent/40 border-l-2 ${
              chat.id === activeChatId
                ? "bg-sidebar-accent/60 border-primary"
                : "border-transparent"
            }`}
          >
            <AvatarBubble
              letter={chat.displayAvatar}
              status={chat.is_group ? undefined : (chat.otherMemberStatus as "online" | "offline" | undefined)}
              imageUrl={chat.is_group ? null : (chat.members.find(m => m.user_id !== user?.id)?.profiles?.avatar_url ?? null)}
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-medium text-sidebar-foreground truncate flex items-center gap-1.5">
                  {chat.is_group && <Users className="h-3 w-3 text-muted-foreground shrink-0" />}
                  {chat.displayName}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTimestamp(chat.lastMessage?.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5 gap-1">
                <p className="text-xs text-muted-foreground truncate">
                  {chat.lastMessage?.content || "No messages yet"}
                </p>
                {chat.unreadCount > 0 && (
                  <span className="shrink-0 h-5 min-w-[20px] px-1.5 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
        {filteredChats.length === 0 && search && (
          <p className="text-xs text-muted-foreground text-center py-6">No chats match "{search}"</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-sidebar-border flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground truncate">
          {profile?.display_name || profile?.username}
        </span>
        <button
          onClick={signOut}
          className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground shrink-0"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>

      <ProfileSettings open={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
};

export default ChatSidebar;
