import { useState, useEffect } from "react";
import styles from "./WaterCooler.module.css";

export default function WaterCooler({ user }) {
  const [posts, setPosts] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [newContent, setNewContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [gifUrl, setGifUrl] = useState("");
  const [posting, setPosting] = useState(false);

  // Reply inputs tracking per post
  const [replyInputs, setReplyInputs] = useState({});
  const [replyFiles, setReplyFiles] = useState({});

  // Moderation Modal State
  const [modModalItem, setModModalItem] = useState(null); // { type, id }
  const [removalReason, setRemovalReason] = useState("Violates community guidelines");

  const STOCK_REASONS = [
    "Violates community guidelines",
    "Off-topic / Individual grievance (Please contact board or use external channels)",
    "Unsafe or unauthorized media",
    "Unkind or disrespectful tone"
  ];

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const isAdmin = user?.role === "board_member" || user?.role === "super_admin";

  const fetchWaterCoolerData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/watercooler`);
      const data = await res.json();
      if (res.ok) {
        setPosts(data.posts || []);
        
        // Group comments by post_id
        const map = {};
        (data.comments || []).forEach(c => {
          if (!map[c.post_id]) map[c.post_id] = [];
          map[c.post_id].push(c);
        });
        setCommentsMap(map);
      }
    } catch (err) {
      console.error("Error fetching water-cooler:", err);
    }
  };

  useEffect(() => {
    fetchWaterCoolerData();
  }, [API_URL]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim() && !selectedFile && !gifUrl) return;

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("author_name", user?.first_name || "Resident");
      formData.append("author_email", user?.email || "");
      formData.append("content", newContent.trim() || (gifUrl ? "Shared a GIF" : "Shared an image"));
      if (selectedFile) formData.append("image", selectedFile);
      if (gifUrl) formData.append("image_url", gifUrl);

      const res = await fetch(`${API_URL}/api/watercooler`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setNewContent("");
        setSelectedFile(null);
        setGifUrl("");
        fetchWaterCoolerData();
      } else {
        alert("Failed to create post.");
      }
    } catch (err) {
      console.error("Network error posting:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleAddComment = async (postId) => {
    const text = replyInputs[postId];
    const file = replyFiles[postId];
    if (!text?.trim() && !file) return;

    try {
      const formData = new FormData();
      formData.append("author_name", user?.first_name || "Resident");
      formData.append("content", text.trim());
      if (file) formData.append("image", file);

      const res = await fetch(`${API_URL}/api/watercooler/${postId}/comments`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setReplyInputs({ ...replyInputs, [postId]: "" });
        setReplyFiles({ ...replyFiles, [postId]: null });
        fetchWaterCoolerData();
      }
    } catch (err) {
      console.error("Error adding reply:", err);
    }
  };

  const handleModerate = async () => {
    if (!modModalItem) return;
    try {
      const res = await fetch(`${API_URL}/api/watercooler/${modModalItem.type}/${modModalItem.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removal_reason: removalReason }),
      });

      if (res.ok) {
        setModModalItem(null);
        fetchWaterCoolerData();
      } else {
        alert("Moderation action failed.");
      }
    } catch (err) {
      console.error("Moderation network error:", err);
    }
  };

  return (
    <div className={styles.container}>
      {/* WATER-COOLER GUIDELINES HEADER */}
      <div className={styles.welcomeBanner}>
        <h3>🌴 The Community Water-Cooler</h3>
        <p>
          Welcome to our shared social space! Keep things <strong>kind, loving, and fun</strong> as we build up our community, meet our neighbors, and get involved. 
          <br /><em>Note: For individual personal grievances or complaints, please visit external channels or contact the executive board directly.</em>
        </p>
      </div>

      {/* CREATE POST CARD */}
      <div className={styles.postCard}>
        <form onSubmit={handleCreatePost} className={styles.postForm}>
          <textarea
            placeholder="Share something positive or start a community chat..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className={styles.textarea}
            rows="3"
          />

          {gifUrl && (
            <div style={{ position: "relative", maxWidth: "200px" }}>
              <img src={gifUrl} alt="Attached GIF" style={{ width: "100%", borderRadius: "8px" }} />
              <button type="button" onClick={() => setGifUrl("")} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer" }}>×</button>
            </div>
          )}

          {selectedFile && (
            <div style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: "600" }}>
              📷 Attached file: {selectedFile.name}
            </div>
          )}

          <div className={styles.postActionsBar}>
            <label className={styles.attachBtn} title="Upload Image">
              📷 Photo <input type="file" accept="image/*" hidden onChange={(e) => setSelectedFile(e.target.files[0] || null)} />
            </label>

            {/* Quick Tenor/GIF integration placeholder trigger */}
            <button 
              type="button" 
              className={styles.attachBtn} 
              onClick={() => {
                const url = prompt("Paste Tenor or Giphy Image URL (.gif):");
                if (url) setGifUrl(url);
              }}
            >
              GIF
            </button>

            <button type="submit" className={styles.submitBtn} disabled={posting}>
              {posting ? "Posting..." : "Post to Water-Cooler"}
            </button>
          </div>
        </form>
      </div>

      {/* FEED STREAM */}
      <div className={styles.feed}>
        {posts.length === 0 ? (
          <div className={styles.emptyCard}>No water-cooler posts yet. Be the first to start a conversation!</div>
        ) : (
          posts.map(post => {
            const postComments = commentsMap[post.id] || [];

            return (
              <div key={post.id} className={styles.feedCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <strong>{post.author_name}</strong>
                    <span className={styles.timestamp}>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>

                  {isAdmin && !post.is_removed && (
                    <button 
                      onClick={() => setModModalItem({ type: "posts", id: post.id })} 
                      className={styles.removeBtn}
                    >
                      🛡️ Remove
                    </button>
                  )}
                </div>

                <p className={`${styles.content} ${post.is_removed ? styles.removedText : ""}`}>
                  {post.content}
                </p>

                {post.image_url && !post.is_removed && (
                  <div className={styles.imageWrapper}>
                    <img src={post.image_url} alt="Post attachment" />
                  </div>
                )}

                {post.removal_reason && (
                  <div className={styles.removalNotice}>
                    ⚠️ Removal Reason: {post.removal_reason}
                  </div>
                )}

                {/* COMMENTS SECTION */}
                <div className={styles.commentsSection}>
                  {postComments.map(c => (
                    <div key={c.id} className={styles.commentBubble}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <strong className={styles.commentAuthor}>{c.author_name}:</strong> 
                          <span className={c.is_removed ? styles.removedText : ""}>{c.content}</span>
                        </div>
                        {isAdmin && !c.is_removed && (
                          <button onClick={() => setModModalItem({ type: "comments", id: c.id })} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer" }}>
                            Remove
                          </button>
                        )}
                      </div>
                      {c.removal_reason && <small style={{ color: "#ef4444", display: "block", marginTop: "2px" }}>Reason: {c.removal_reason}</small>}
                    </div>
                  ))}

                  {/* REPLY INPUT */}
                  {!post.is_removed && (
                    <div className={styles.replyBox}>
                      <input 
                        type="text" 
                        placeholder="Write a reply..." 
                        value={replyInputs[post.id] || ""}
                        onChange={(e) => setReplyInputs({ ...replyInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(post.id); }}
                        className={styles.replyInput}
                      />
                      <button onClick={() => handleAddComment(post.id)} className={styles.replySendBtn}>Reply</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADMIN REMOVAL MODAL */}
      {modModalItem && (
        <div className={styles.modalBackdrop} onClick={() => setModModalItem(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>🛡️ Moderate Content</h3>
            <p>Select a stock reason for removing this item:</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "15px 0" }}>
              {STOCK_REASONS.map((reason, idx) => (
                <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", cursor: "pointer" }}>
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

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleModerate} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
                Confirm Removal
              </button>
              <button onClick={() => setModModalItem(null)} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}