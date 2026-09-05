import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, ImagePlus, MessageCircle, Smile, X } from "lucide-react";
import EmojiPicker from "../ui/EmojiPicker";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import { apiFetch } from "../../api";
import { PATHS } from "../../layout/navConfig";
import styles from "./Porch.module.css";

const QUICK_REACT = ["👍", "❤️", "😂", "🎉", "🙏"];

const STOCK_REASONS = [
  "Violates community guidelines",
  "Off-topic / personal grievance — please contact the board",
  "Unsafe or unauthorized media",
  "Unkind or disrespectful tone",
];

function relativeTime(dateInput) {
  if (!dateInput) return "";
  const then = new Date(dateInput).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateInput).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function normalizeReactions(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  Object.entries(raw).forEach(([emoji, value]) => {
    if (Array.isArray(value)) out[emoji] = value;
    else if (value && Array.isArray(value.users)) out[emoji] = value.users;
  });
  return out;
}

function clip(text, max = 140) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function replyLabel(count) {
  if (!count) return "Reply";
  if (count === 1) return "1 reply";
  return `${count} replies`;
}

function ReactionBar({ reactions, identity, onReact, compact }) {
  const extras = Object.entries(reactions).filter(([emoji]) => !QUICK_REACT.includes(emoji));
  const items = compact
    ? Object.entries(reactions).filter(([, list]) => list.length)
    : [...QUICK_REACT.map((emoji) => [emoji, reactions[emoji] || []]), ...extras];

  if (compact && items.length === 0) return null;

  return (
    <div className={styles.reactRow}>
      {items.map(([emoji, list]) => {
        const count = (list || []).length;
        const mine = (list || []).includes(identity);
        return (
          <button
            key={emoji}
            type="button"
            className={`${styles.react} ${mine ? styles.reactOn : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReact(emoji);
            }}
          >
            {emoji} {count || ""}
          </button>
        );
      })}
    </div>
  );
}

export default function Porch({ user }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [showGifField, setShowGifField] = useState(false);
  const [showComposerEmoji, setShowComposerEmoji] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [modModalItem, setModModalItem] = useState(null);
  const [removalReason, setRemovalReason] = useState(STOCK_REASONS[0]);
  const [lightbox, setLightbox] = useState("");
  const fileRef = useRef(null);

  const isAdmin = user?.role === "board_member" || user?.role === "super_admin";
  const identity = user?.email || String(user?.id || "");
  const activePost = posts.find((post) => String(post.id) === String(postId));
  const threadComments = activePost ? commentsMap[activePost.id] || [] : [];

  const loadFeed = async () => {
    try {
      const res = await apiFetch("/api/porch");
      const data = await res.json();
      if (res.ok) {
        setPosts(data.posts || []);
        const map = {};
        (data.comments || []).forEach((comment) => {
          if (!map[comment.post_id]) map[comment.post_id] = [];
          map[comment.post_id].push(comment);
        });
        setCommentsMap(map);
      }
    } catch (err) {
      console.error("Porch fetch error:", err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    setReplyText("");
    setError("");
  }, [postId]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim() && !selectedFile && !gifUrl) return;
    setPosting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("author_name", user?.first_name || "Resident");
      formData.append("author_email", user?.email || "");
      formData.append(
        "content",
        newContent.trim() || (gifUrl ? "Shared a GIF" : "Shared a photo"),
      );
      if (selectedFile) formData.append("image", selectedFile);
      if (gifUrl) formData.append("image_url", gifUrl);

      const res = await apiFetch("/api/porch", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNewContent("");
        setSelectedFile(null);
        setGifUrl("");
        setShowGifField(false);
        setShowComposerEmoji(false);
        loadFeed();
      } else {
        setError(data.error || "Couldn't publish that post.");
      }
    } catch {
      setError("Network error posting to The Porch.");
    } finally {
      setPosting(false);
    }
  };

  const handleAddComment = async (id) => {
    if (!replyText.trim()) return;
    try {
      const formData = new FormData();
      formData.append("author_name", user?.first_name || "Resident");
      formData.append("content", replyText.trim());
      const res = await apiFetch(`/api/porch/${id}/comments`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setReplyText("");
        loadFeed();
      }
    } catch (err) {
      console.error("Error adding reply:", err);
    }
  };

  const handleReact = async (id, emoji) => {
    setPosts((current) =>
      current.map((post) => {
        if (post.id !== id) return post;
        const reactions = normalizeReactions(post.reactions);
        const list = reactions[emoji] || [];
        reactions[emoji] = list.includes(identity)
          ? list.filter((item) => item !== identity)
          : [...list, identity];
        if (reactions[emoji].length === 0) delete reactions[emoji];
        return { ...post, reactions };
      }),
    );
    try {
      await apiFetch(`/api/porch/${id}/reactions`, {
        method: "PATCH",
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.error("Reaction save failed:", err);
    }
  };

  const handleModerate = async () => {
    if (!modModalItem) return;
    try {
      const res = await apiFetch(`/api/porch/${modModalItem.type}/${modModalItem.id}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({ removal_reason: removalReason }),
      });
      if (res.ok) {
        setModModalItem(null);
        loadFeed();
      }
    } catch (err) {
      console.error("Moderation network error:", err);
    }
  };

  const insertComposerEmoji = (glyph) => {
    setNewContent((value) => `${value}${glyph}`);
    setShowComposerEmoji(false);
  };

  const moderationModal = modModalItem ? (
    <Modal
      title="Remove from The Porch"
      description="Neighbors will see that this was removed, with the reason you choose."
      onClose={() => setModModalItem(null)}
    >
      <div className={styles.modList}>
        {STOCK_REASONS.map((reason) => (
          <label key={reason}>
            <input
              type="radio"
              name="removalReason"
              value={reason}
              checked={removalReason === reason}
              onChange={(e) => setRemovalReason(e.target.value)}
            />
            {reason}
          </label>
        ))}
      </div>
      <div className={styles.modActions}>
        <Button variant="secondary" onClick={() => setModModalItem(null)}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleModerate}>
          Remove
        </Button>
      </div>
    </Modal>
  ) : null;

  const lightboxEl = lightbox ? (
    <button type="button" className={styles.lightbox} onClick={() => setLightbox("")}>
      <img src={lightbox} alt="" />
    </button>
  ) : null;

  if (postId) {
    return (
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={() => navigate(PATHS.porch)}>
          <ArrowLeft size={16} />
          All posts
        </button>

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : !activePost ? (
          <div className={styles.empty}>
            That post isn't on The Porch anymore.
            <Link to={PATHS.porch} className={styles.emptyLink}>
              Back to all posts
            </Link>
          </div>
        ) : (
          <>
            <article className={styles.threadPost}>
              <header className={styles.cardHead}>
                <Avatar name={activePost.author_name} size="md" />
                <div className={styles.who}>
                  <strong>{activePost.author_name}</strong>
                  <span>{relativeTime(activePost.created_at)}</span>
                </div>
                {isAdmin && !activePost.is_removed && (
                  <button
                    type="button"
                    className={styles.moderate}
                    onClick={() => setModModalItem({ type: "posts", id: activePost.id })}
                  >
                    Remove
                  </button>
                )}
              </header>

              <p className={`${styles.body} ${activePost.is_removed ? styles.removed : ""}`}>
                {activePost.content}
              </p>

              {activePost.image_url && !activePost.is_removed && (
                <button
                  type="button"
                  className={styles.media}
                  onClick={() => setLightbox(activePost.image_url)}
                >
                  <img src={activePost.image_url} alt="" />
                </button>
              )}

              {activePost.removal_reason && (
                <p className={styles.removedNote}>Removed: {activePost.removal_reason}</p>
              )}

              {!activePost.is_removed && (
                <ReactionBar
                  reactions={normalizeReactions(activePost.reactions)}
                  identity={identity}
                  onReact={(emoji) => handleReact(activePost.id, emoji)}
                />
              )}
            </article>

            <section className={styles.threadReplies}>
              <h3>
                {threadComments.length
                  ? replyLabel(threadComments.length)
                  : "Replies"}
              </h3>

              {threadComments.length === 0 && (
                <p className={styles.noReplies}>No replies yet. Start the thread.</p>
              )}

              {threadComments.map((comment) => (
                <div key={comment.id} className={styles.comment}>
                  <Avatar name={comment.author_name} size="sm" />
                  <div className={styles.commentBody}>
                    <strong>
                      {comment.author_name}
                      <span>{relativeTime(comment.created_at)}</span>
                    </strong>
                    <span className={comment.is_removed ? styles.removed : ""}>{comment.content}</span>
                    {comment.image_url && !comment.is_removed && (
                      <img src={comment.image_url} alt="" className={styles.commentImg} />
                    )}
                    {comment.removal_reason && <em>Removed: {comment.removal_reason}</em>}
                  </div>
                  {isAdmin && !comment.is_removed && (
                    <button
                      type="button"
                      className={styles.moderate}
                      onClick={() => setModModalItem({ type: "comments", id: comment.id })}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {!activePost.is_removed && (
                <div className={styles.reply}>
                  <Avatar name={user?.first_name} photo={user?.photo} size="sm" />
                  <input
                    type="text"
                    placeholder="Write a reply…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddComment(activePost.id);
                      }
                    }}
                  />
                  <button type="button" onClick={() => handleAddComment(activePost.id)}>
                    Reply
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {lightboxEl}
        {moderationModal}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Neighborhood</p>
          <h2>The Porch</h2>
          <p>
            Say hello, share a photo, or pass along something useful. Open a post to read and
            reply.
          </p>
        </div>
      </header>

      <form className={styles.composer} onSubmit={handleCreatePost}>
        <Avatar name={user?.first_name} photo={user?.photo} />
        <div className={styles.composerBody}>
          <textarea
            placeholder={`What's happening on the block, ${user?.first_name || "neighbor"}?`}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows="3"
          />
          {(previewUrl || gifUrl) && (
            <div className={styles.preview}>
              <img src={previewUrl || gifUrl} alt="" />
              <button
                type="button"
                className={styles.previewClear}
                onClick={() => {
                  setSelectedFile(null);
                  setGifUrl("");
                }}
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {showGifField && (
            <input
              className={styles.gifField}
              type="url"
              placeholder="Paste a GIF link"
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
            />
          )}
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.composerBar}>
            <div className={styles.tools}>
              <button type="button" className={styles.tool} onClick={() => fileRef.current?.click()}>
                <ImagePlus size={16} />
                Photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
              <button type="button" className={styles.tool} onClick={() => setShowGifField((v) => !v)}>
                GIF
              </button>
              <button
                type="button"
                className={styles.tool}
                onClick={() => setShowComposerEmoji((v) => !v)}
              >
                <Smile size={16} />
                Emoji
              </button>
            </div>
            <Button type="submit" disabled={posting || (!newContent.trim() && !selectedFile && !gifUrl)}>
              {posting ? "Posting..." : "Post"}
            </Button>
          </div>
          {showComposerEmoji && (
            <div className={styles.pickerWrap}>
              <EmojiPicker onPick={insertComposerEmoji} onClose={() => setShowComposerEmoji(false)} />
            </div>
          )}
        </div>
      </form>

      {posts.length === 0 ? (
        <div className={styles.empty}>The Porch is quiet. Be the first to say hello.</div>
      ) : (
        <div className={styles.list}>
          {posts.map((post) => {
            const comments = commentsMap[post.id] || [];
            const reactions = normalizeReactions(post.reactions);
            const snippet =
              clip(post.content, 160) ||
              (post.image_url && !post.is_removed ? "Shared a photo" : "");
            return (
              <article key={post.id} className={styles.row}>
                <Link to={`${PATHS.porch}/${post.id}`} className={styles.rowMain}>
                  <Avatar name={post.author_name} size="md" />
                  <div className={styles.rowCopy}>
                    <div className={styles.who}>
                      <strong>{post.author_name}</strong>
                      <span>{relativeTime(post.created_at)}</span>
                    </div>
                    <p className={`${styles.snippet} ${post.is_removed ? styles.removed : ""}`}>
                      {snippet}
                    </p>
                  </div>
                  {post.image_url && !post.is_removed && (
                    <img src={post.image_url} alt="" className={styles.thumb} />
                  )}
                  <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
                </Link>
                <div className={styles.rowFoot}>
                  <Link to={`${PATHS.porch}/${post.id}`} className={styles.replyHint}>
                    <MessageCircle size={14} />
                    {replyLabel(comments.length)}
                  </Link>
                  {!post.is_removed && (
                    <ReactionBar
                      compact
                      reactions={reactions}
                      identity={identity}
                      onReact={(emoji) => handleReact(post.id, emoji)}
                    />
                  )}
                  {isAdmin && !post.is_removed && (
                    <button
                      type="button"
                      className={styles.moderate}
                      onClick={() => setModModalItem({ type: "posts", id: post.id })}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {lightboxEl}
      {moderationModal}
    </div>
  );
}
