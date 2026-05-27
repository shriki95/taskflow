import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ArrowLeft, X, RefreshCw, ExternalLink,
  Heart, Eye, MessageCircle, Share2, Trash2, AlertCircle, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import { socialPostsApi } from '../api/supabase';

// ── Helpers ─────────────────────────────────────────────────────

function detectPlatform(url) {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  return null;
}

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

async function fetchTikTokData(url) {
  const res = await fetch(
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
    { headers: { 'Accept': 'application/json' } }
  );
  if (!res.ok) throw new Error(`TikTok API error ${res.status}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.msg || 'TikTok fetch failed');
  const d = json.data;
  return {
    platform: 'tiktok',
    author: d.author?.nickname || d.author?.unique_id || '',
    author_avatar: d.author?.avatar || '',
    thumbnail_url: d.cover || d.origin_cover || '',
    caption: d.title || '',
    likes: d.digg_count || 0,
    comments: d.comment_count || 0,
    views: d.play || d.play_count || 0,
    shares: d.share_count || 0,
    saves: d.collect_count || 0,
  };
}

async function fetchInstagramData(url, apiKey) {
  const res = await fetch(
    `https://instagram-scraper-stable-api.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(url)}`,
    { headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'instagram-scraper-stable-api.p.rapidapi.com' } }
  );
  if (!res.ok) throw new Error(`Instagram API error ${res.status}`);
  const json = await res.json();
  const d = json.data || json;
  return {
    platform: 'instagram',
    author: d.user?.username || '',
    author_avatar: d.user?.profile_pic_url || '',
    thumbnail_url: d.thumbnail_url || d.display_url || d.image_versions2?.candidates?.[0]?.url || '',
    caption: d.edge_media_to_caption?.edges?.[0]?.node?.text || d.caption?.text || '',
    likes: d.edge_media_preview_like?.count ?? d.like_count ?? 0,
    comments: d.edge_media_to_comment?.count ?? d.comment_count ?? 0,
    views: d.video_view_count ?? d.view_count ?? 0,
    shares: 0,
    saves: 0,
    posted_at: d.taken_at_timestamp ? new Date(d.taken_at_timestamp * 1000).toISOString() : null,
  };
}

async function fetchPostData(url, apiKey) {
  const platform = detectPlatform(url);
  if (!platform) throw new Error('Unsupported platform. Please use a TikTok or Instagram URL.');
  return platform === 'tiktok' ? fetchTikTokData(url) : fetchInstagramData(url, apiKey);
}

// ── Platform badge ───────────────────────────────────────────────

function PlatformBadge({ platform }) {
  if (platform === 'tiktok') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-black border border-white/20 text-white flex items-center gap-1 w-fit">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.84a8.18 8.18 0 0 0 4.78 1.53V6.91a4.85 4.85 0 0 1-1.01-.22z"/>
        </svg>
        TikTok
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white flex items-center gap-1 w-fit"
      style={{ background: 'linear-gradient(45deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)' }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
      Instagram
    </span>
  );
}

// ── Post Card ────────────────────────────────────────────────────

function PostCard({ post, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      onClick={() => onClick(post)}
      className="bg-app-card border border-app-border rounded-2xl overflow-hidden cursor-pointer hover:border-slate-600 transition-all group"
    >
      <div className="relative aspect-square bg-app-bg overflow-hidden">
        {post.thumbnail_url ? (
          <img
            src={post.thumbnail_url} alt={post.caption || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20"
            style={{ background: post.platform === 'tiktok'
              ? 'linear-gradient(135deg,#010101,#1a1a1a)'
              : 'linear-gradient(135deg,#833ab4,#fd1d1d 50%,#fcb045)' }}>
            {post.platform === 'tiktok' ? '♪' : '📷'}
          </div>
        )}
        <div className="absolute top-2 left-2"><PlatformBadge platform={post.platform} /></div>
        <a href={post.url} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/60 text-white transition">
          <ExternalLink size={11} />
        </a>
      </div>

      <div className="p-3">
        {post.author && <p className="text-[11px] text-slate-400 font-medium mb-1">@{post.author}</p>}
        {post.caption && (
          <p className="text-[11px] text-slate-300 leading-relaxed mb-2 line-clamp-2">{post.caption}</p>
        )}
        <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
          {post.views > 0 && <span className="flex items-center gap-0.5"><Eye size={9}/>{fmt(post.views)}</span>}
          {post.likes > 0 && <span className="flex items-center gap-0.5 text-rose-400/80"><Heart size={9}/>{fmt(post.likes)}</span>}
          {post.comments > 0 && <span className="flex items-center gap-0.5"><MessageCircle size={9}/>{fmt(post.comments)}</span>}
          {post.shares > 0 && <span className="flex items-center gap-0.5"><Share2 size={9}/>{fmt(post.shares)}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Add Post Modal ───────────────────────────────────────────────

function AddPostModal({ projectId, apiKey, onClose, onAdded }) {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [postData, setPostData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetching(true); setError(''); setPostData(null);
    try {
      const data = await fetchPostData(url.trim(), apiKey);
      setPostData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch post data. Check the URL and your API key.');
    } finally { setFetching(false); }
  };

  const handleSave = async () => {
    if (!postData) return;
    setSaving(true);
    try {
      const saved = await socialPostsApi.create(projectId, { url: url.trim(), ...postData, notes });
      onAdded(saved);
      onClose();
    } catch {
      setError('Failed to save post.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-app-card border border-app-border rounded-2xl p-6 w-full max-w-lg z-10 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">Add post</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition"><X size={20}/></button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            placeholder="Paste TikTok or Instagram URL…"
            className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent transition text-sm"
          />
          <button onClick={handleFetch} disabled={!url.trim() || fetching}
            className="px-4 py-2.5 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50 transition hover:opacity-90 flex items-center gap-2 flex-shrink-0">
            {fetching ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
            Fetch
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
            {error}
          </div>
        )}

        {fetching && (
          <div className="flex items-center justify-center py-10">
            <div className="text-center">
              <Loader2 size={28} className="animate-spin text-brand-accent mx-auto mb-3"/>
              <p className="text-slate-400 text-sm">Fetching post data…</p>
            </div>
          </div>
        )}

        {postData && !fetching && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex gap-4 p-3 bg-app-bg rounded-xl border border-app-border">
              {postData.thumbnail_url && (
                <img src={postData.thumbnail_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0"/>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <PlatformBadge platform={postData.platform}/>
                  {postData.author && <span className="text-xs text-slate-400">@{postData.author}</span>}
                </div>
                {postData.caption && <p className="text-xs text-slate-300 line-clamp-3">{postData.caption}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'views', label: 'Views', Icon: Eye },
                { key: 'likes', label: 'Likes', Icon: Heart },
                { key: 'comments', label: 'Comments', Icon: MessageCircle },
                { key: 'shares', label: 'Shares', Icon: Share2 },
              ].map(({ key, label, Icon }) => (
                <div key={key} className="bg-app-bg rounded-lg p-2.5 border border-app-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={11} className="text-slate-500"/>
                    <span className="text-[10px] text-slate-500">{label}</span>
                  </div>
                  <input type="number" min="0" value={postData[key] || 0}
                    onChange={(e) => setPostData(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-transparent text-slate-200 text-sm font-semibold focus:outline-none"/>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2} placeholder="Notes about this post…"
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent transition text-sm resize-none"/>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 rounded-xl bg-brand-accent text-white font-semibold disabled:opacity-50 transition hover:opacity-90">
              {saving ? 'Saving…' : 'Add to project'}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ── Post Detail Modal ────────────────────────────────────────────

function PostDetailModal({ post, apiKey, onClose, onDelete, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const newData = await fetchPostData(post.url, apiKey);
      await onRefresh(post.id, newData);
    } catch {}
    finally { setRefreshing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-app-card border border-app-border rounded-2xl w-full max-w-md z-10 overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="relative flex-shrink-0 bg-app-bg" style={{ aspectRatio: '1' }}>
          {post.thumbnail_url ? (
            <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full" style={{ background: post.platform === 'tiktok'
              ? 'linear-gradient(135deg,#010101,#1a1a1a)'
              : 'linear-gradient(135deg,#833ab4,#fd1d1d 50%,#fcb045)' }}/>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition">
            <X size={15}/>
          </button>
          <div className="absolute top-3 left-3"><PlatformBadge platform={post.platform}/></div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-3">
            <div>{post.author && <p className="text-sm font-medium text-slate-300">@{post.author}</p>}</div>
            <div className="flex gap-1">
              <button onClick={handleRefresh} disabled={refreshing} title="Refresh metrics"
                className="p-1.5 rounded-lg text-slate-500 hover:text-brand-accent hover:bg-brand-accent/10 transition">
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>
              </button>
              <a href={post.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-app-bg transition">
                <ExternalLink size={14}/>
              </a>
              <button onClick={() => { onDelete(post.id); onClose(); }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
                <Trash2 size={14}/>
              </button>
            </div>
          </div>

          {post.caption && <p className="text-sm text-slate-300 mb-4 leading-relaxed">{post.caption}</p>}

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Views',    value: post.views,    Icon: Eye,           color: 'text-slate-300' },
              { label: 'Likes',    value: post.likes,    Icon: Heart,         color: 'text-rose-400'  },
              { label: 'Comments', value: post.comments, Icon: MessageCircle, color: 'text-blue-400'  },
              { label: 'Shares',   value: post.shares,   Icon: Share2,        color: 'text-emerald-400' },
            ].map(({ label, value, Icon, color }) => (
              <div key={label} className="bg-app-bg rounded-xl p-2.5 text-center border border-app-border">
                <Icon size={13} className={`${color} mx-auto mb-1`}/>
                <p className="text-sm font-bold text-slate-200">{fmt(value)}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {post.notes && (
            <div className="bg-app-bg rounded-xl p-3 border border-app-border mb-3">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">Notes</p>
              <p className="text-sm text-slate-300">{post.notes}</p>
            </div>
          )}
          {post.created_at && (
            <p className="text-[11px] text-slate-600">
              Added {format(new Date(post.created_at), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY || '';

export default function SocialTrackerPage({ project }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    socialPostsApi.list(project.projectId)
      .then(({ data }) => setPosts(data.posts))
      .finally(() => setLoading(false));
  }, [project.projectId]);

  const handleAdded = (post) => setPosts((prev) => [post, ...prev]);

  const handleDelete = async (postId) => {
    await socialPostsApi.delete(project.projectId, postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleRefresh = async (postId, newData) => {
    await socialPostsApi.update(project.projectId, postId, newData);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, ...newData } : p));
  };

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-app-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-300 transition flex-shrink-0">
              <ArrowLeft size={18}/>
            </button>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }}/>
            <h1 className="font-semibold text-slate-100 truncate">{project.name}</h1>
            {posts.length > 0 && (
              <span className="text-xs text-slate-500 bg-app-card border border-app-border px-2 py-0.5 rounded-full flex-shrink-0">
                {posts.length}
              </span>
            )}
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg transition text-sm">
            <Plus size={15}/> Add post
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-accent border-t-transparent"/>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-app-card border border-app-border rounded-2xl flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
                  <rect x="2" y="2" width="20" height="20" rx="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              </div>
              <h3 className="text-slate-300 font-semibold mb-2">No posts yet</h3>
              <p className="text-slate-600 text-sm mb-6 max-w-xs">
                Add your first TikTok or Instagram post to start tracking.
              </p>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg transition text-sm">
                <Plus size={15}/> Add first post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onClick={setSelectedPost}/>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddPostModal
            projectId={project.projectId}
            apiKey={API_KEY}
            onClose={() => setShowAdd(false)}
            onAdded={handleAdded}
          />
        )}
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            apiKey={API_KEY}
            onClose={() => setSelectedPost(null)}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
