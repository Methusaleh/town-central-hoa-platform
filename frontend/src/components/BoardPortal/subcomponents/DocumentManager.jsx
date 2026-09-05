import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../api";
import styles from "./DocumentManager.module.css";

function IconFolder({ size = 44 }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 48 40" aria-hidden="true">
      <path fill="#f5c451" d="M4 8a4 4 0 0 1 4-4h10l4 4h18a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
      <path fill="#e0a82e" d="M4 16h40v16a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V16z" opacity="0.35" />
    </svg>
  );
}

function IconFile({ size = 40 }) {
  return (
    <svg width={size * 0.78} height={size} viewBox="0 0 32 40" aria-hidden="true">
      <path fill="#f8fafc" stroke="#cbd5e1" d="M6 2.5h13l9 9V36a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 36V5A2.5 2.5 0 0 1 6 2.5z" />
      <path fill="#e2e8f0" d="M19 2.5V12h9" />
    </svg>
  );
}

function itemKey(type, id) {
  return `${type}:${id}`;
}

function fileKind(name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext || ext === name.toLowerCase()) return "Document";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "Image";
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "Word document";
  if (["xls", "xlsx", "csv"].includes(ext)) return "Spreadsheet";
  return ext.toUpperCase() + " file";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DocumentManager({ onBack }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [history, setHistory] = useState([null]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [viewMode, setViewMode] = useState("icons");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(() => new Set(["root"]));
  const [contextMenu, setContextMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const paneRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastClicked = useRef(null);

  const fetchData = async () => {
    const [catsRes, docsRes] = await Promise.all([
      apiFetch("/api/documents/categories"),
      apiFetch("/api/documents"),
    ]);
    const catsData = await catsRes.json();
    const docsData = await docsRes.json();
    setFolders(Array.isArray(catsData) ? catsData : []);
    setDocuments(Array.isArray(docsData) ? docsData : []);
  };

  useEffect(() => {
    fetchData().catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const childrenOf = (parentId) =>
    folders.filter((f) => (parentId == null ? !f.parent_id : String(f.parent_id) === String(parentId)));

  const breadcrumbs = useMemo(() => {
    const path = [{ id: null, name: "Documents" }];
    const trail = [];
    let currId = currentFolderId;
    while (currId != null) {
      const folder = folders.find((f) => String(f.id) === String(currId));
      if (!folder) break;
      trail.unshift(folder);
      currId = folder.parent_id;
    }
    return [...path, ...trail];
  }, [folders, currentFolderId]);

  const visibleItems = useMemo(() => {
    const folderRows = folders
      .filter((f) => (currentFolderId == null ? !f.parent_id : String(f.parent_id) === String(currentFolderId)))
      .map((f) => ({ type: "folder", id: f.id, name: f.name, created_at: f.created_at, raw: f }));
    const fileRows = documents
      .filter((d) => (currentFolderId == null ? !d.category_id : String(d.category_id) === String(currentFolderId)))
      .map((d) => ({ type: "file", id: d.id, name: d.title, created_at: d.created_at, file_url: d.file_url, raw: d }));

    const q = query.trim().toLowerCase();
    const filtered = [...folderRows, ...fileRows].filter((item) => !q || item.name.toLowerCase().includes(q));

    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      if (sortBy === "date") return (new Date(a.created_at || 0) - new Date(b.created_at || 0)) * dir;
      if (sortBy === "kind") return (fileKind(a.name).localeCompare(fileKind(b.name))) * dir;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * dir;
    });
  }, [folders, documents, currentFolderId, query, sortBy, sortDir]);

  const navigateToFolder = (folderId) => {
    const next = history.slice(0, historyIndex + 1);
    next.push(folderId);
    setHistory(next);
    setHistoryIndex(next.length - 1);
    setCurrentFolderId(folderId);
    setSelected(new Set());
    setContextMenu(null);
    setRenaming(null);
    if (folderId != null) {
      setExpanded((prev) => new Set([...prev, String(folderId)]));
    }
  };

  const handleBack = () => {
    if (historyIndex === 0) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    setCurrentFolderId(history[next]);
    setSelected(new Set());
  };

  const handleForward = () => {
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setCurrentFolderId(history[next]);
    setSelected(new Set());
  };

  const handleUp = () => {
    if (currentFolderId == null) return;
    const folder = folders.find((f) => String(f.id) === String(currentFolderId));
    navigateToFolder(folder?.parent_id || null);
  };

  const selectItem = (item, e) => {
    const key = itemKey(item.type, item.id);
    setRenaming(null);
    if (e.metaKey || e.ctrlKey) {
      const next = new Set(selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setSelected(next);
      lastClicked.current = key;
      return;
    }
    if (e.shiftKey && lastClicked.current) {
      const keys = visibleItems.map((row) => itemKey(row.type, row.id));
      const start = keys.indexOf(lastClicked.current);
      const end = keys.indexOf(key);
      if (start >= 0 && end >= 0) {
        const [a, b] = start < end ? [start, end] : [end, start];
        setSelected(new Set(keys.slice(a, b + 1)));
        return;
      }
    }
    setSelected(new Set([key]));
    lastClicked.current = key;
  };

  const openItem = (item) => {
    if (item.type === "folder") navigateToFolder(item.id);
    else if (item.file_url) window.open(item.file_url, "_blank", "noopener");
  };

  const uploadFiles = async (fileList, folderId = currentFolderId) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (folderId) formData.append("category_id", folderId);
      files.forEach((file) => formData.append("files", file));
      const res = await apiFetch("/api/documents", { method: "POST", body: formData });
      if (res.ok) await fetchData();
      else alert("Upload failed.");
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const createFolder = async () => {
    const name = window.prompt("New folder name", "Untitled Folder");
    if (!name?.trim()) return;
    const res = await apiFetch("/api/documents/categories", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), parent_id: currentFolderId }),
    });
    if (res.ok) fetchData();
    else alert("Could not create folder.");
  };

  const startRename = (item) => {
    setRenaming({ type: item.type, id: item.id });
    setRenameValue(item.name);
    setContextMenu(null);
  };

  const commitRename = async () => {
    if (!renaming || !renameValue.trim()) {
      setRenaming(null);
      return;
    }
    const path =
      renaming.type === "folder"
        ? `/api/documents/categories/${renaming.id}`
        : `/api/documents/${renaming.id}`;
    const body = renaming.type === "folder" ? { name: renameValue.trim() } : { title: renameValue.trim() };
    const res = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    setRenaming(null);
    if (res.ok) fetchData();
    else alert("Rename failed.");
  };

  const deleteSelected = async (items) => {
    const targets = items || visibleItems.filter((item) => selected.has(itemKey(item.type, item.id)));
    if (targets.length === 0) return;
    const label = targets.length === 1 ? targets[0].name : `${targets.length} items`;
    if (!window.confirm(`Move ${label} to trash? This cannot be undone.`)) return;
    for (const item of targets) {
      const path = item.type === "folder" ? `/api/documents/categories/${item.id}` : `/api/documents/${item.id}`;
      await apiFetch(path, { method: "DELETE" });
    }
    setSelected(new Set());
    fetchData();
  };

  const moveItem = async (type, id, targetFolderId) => {
    if (type === "folder" && String(id) === String(targetFolderId)) return;
    const path = type === "folder" ? `/api/documents/categories/${id}` : `/api/documents/${id}`;
    const body = type === "folder" ? { parent_id: targetFolderId } : { category_id: targetFolderId };
    const res = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    if (res.ok) fetchData();
  };

  const onPaneDrop = async (e, folderId = currentFolderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);
    const raw = e.dataTransfer.getData("application/x-explorer-item");
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        await moveItem(payload.type, payload.id, folderId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (e.dataTransfer.files?.length) {
      await uploadFiles(e.dataTransfer.files, folderId);
    }
  };

  const onItemDragStart = (e, item) => {
    e.dataTransfer.setData("application/x-explorer-item", JSON.stringify({ type: item.type, id: item.id }));
    e.dataTransfer.effectAllowed = "move";
  };

  const showMenu = (e, type, item = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (item) {
      const key = itemKey(item.type, item.id);
      if (!selected.has(key)) setSelected(new Set([key]));
    }
    setContextMenu({ type, item, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!paneRef.current?.contains(document.activeElement) && document.activeElement !== paneRef.current) {
        if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      }
      if (renaming) {
        if (e.key === "Escape") setRenaming(null);
        return;
      }
      if (e.key === "Enter" && selected.size === 1) {
        const item = visibleItems.find((row) => selected.has(itemKey(row.type, row.id)));
        if (item) openItem(item);
      }
      if (e.key === "F2" && selected.size === 1) {
        const item = visibleItems.find((row) => selected.has(itemKey(row.type, row.id)));
        if (item) startRename(item);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected.size > 0 && !e.metaKey) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "Escape") {
        setSelected(new Set());
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleTree = (id, e) => {
    e.stopPropagation();
    const key = String(id ?? "root");
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderTree = (parentId, depth) => {
    const rows = childrenOf(parentId);
    return rows.map((folder) => {
      const hasKids = childrenOf(folder.id).length > 0;
      const open = expanded.has(String(folder.id));
      const active = String(currentFolderId) === String(folder.id);
      return (
        <div key={folder.id}>
          <div className={`${styles.treeRow} ${active ? styles.treeRowActive : ""}`} style={{ paddingLeft: 8 + depth * 14 }}>
            <button className={styles.treeTwist} onClick={(e) => toggleTree(folder.id, e)} aria-label="Toggle folder">
              {hasKids ? (open ? "▾" : "▸") : ""}
            </button>
            <button
              className={styles.treeRow}
              style={{ flex: 1, padding: 0 }}
              onClick={() => navigateToFolder(folder.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onPaneDrop(e, folder.id)}
            >
              <IconFolder size={16} />
              <span className={styles.treeName}>{folder.name}</span>
            </button>
          </div>
          {open && renderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  const selectedCount = selected.size;
  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <button className={styles.backBtn} onClick={onBack}>← Mission Control</button>
      </div>

      <div className={styles.window}>
        <div className={styles.titlebar}>
          <div className={styles.title}>Community Documents</div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === "icons" ? styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("icons")}
              title="Icon view"
            >
              ▦
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.navBtns}>
            <button className={styles.navBtn} onClick={handleBack} disabled={historyIndex === 0} title="Back">←</button>
            <button className={styles.navBtn} onClick={handleForward} disabled={historyIndex >= history.length - 1} title="Forward">→</button>
            <button className={styles.navBtn} onClick={handleUp} disabled={currentFolderId == null} title="Enclosing folder">↑</button>
          </div>
          <div className={styles.pathBar}>
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.id ?? "root"} style={{ display: "flex", alignItems: "center" }}>
                {idx > 0 && <span className={styles.sep}>/</span>}
                <button
                  className={`${styles.crumb} ${idx === breadcrumbs.length - 1 ? styles.crumbCurrent : ""}`}
                  onClick={() => navigateToFolder(crumb.id)}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
          <input
            className={styles.search}
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.toolbarActions}>
            <button className={styles.actionBtn} onClick={createFolder}>New Folder</button>
            <button className={styles.actionBtn} onClick={() => fileInputRef.current?.click()}>Upload</button>
          </div>
        </div>

        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <div className={styles.treeLabel}>Locations</div>
            <button
              className={`${styles.treeRow} ${currentFolderId == null ? styles.treeRowActive : ""}`}
              onClick={() => navigateToFolder(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onPaneDrop(e, null)}
            >
              <span className={styles.treeTwist} />
              <IconFolder size={16} />
              <span className={styles.treeName}>Documents</span>
            </button>
            {renderTree(null, 1)}
          </aside>

          <div
            ref={paneRef}
            tabIndex={0}
            className={`${styles.pane} ${dropActive ? styles.dropTarget : ""}`}
            onClick={() => { setSelected(new Set()); setRenaming(null); }}
            onContextMenu={(e) => showMenu(e, "bg")}
            onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(e) => onPaneDrop(e, currentFolderId)}
          >
            {uploading && <div className={styles.uploadOverlay}>Copying files…</div>}

            {visibleItems.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>This folder is empty</div>
                <div className={styles.emptyHint}>Drag files here, or use Upload / New Folder.</div>
              </div>
            ) : viewMode === "icons" ? (
              <div className={styles.iconGrid}>
                {visibleItems.map((item) => {
                  const key = itemKey(item.type, item.id);
                  const isOn = selected.has(key);
                  const isRenaming = renaming && renaming.type === item.type && String(renaming.id) === String(item.id);
                  return (
                    <div
                      key={key}
                      className={`${styles.iconItem} ${isOn ? styles.iconItemSelected : ""}`}
                      onClick={(e) => { e.stopPropagation(); selectItem(item, e); }}
                      onDoubleClick={() => openItem(item)}
                      onContextMenu={(e) => showMenu(e, item.type, item)}
                      draggable
                      onDragStart={(e) => onItemDragStart(e, item)}
                      onDragOver={item.type === "folder" ? (e) => e.preventDefault() : undefined}
                      onDrop={item.type === "folder" ? (e) => onPaneDrop(e, item.id) : undefined}
                    >
                      <div className={styles.iconGlyph}>
                        {item.type === "folder" ? <IconFolder /> : <IconFile />}
                      </div>
                      {isRenaming ? (
                        <input
                          className={styles.renameInput}
                          value={renameValue}
                          autoFocus
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setRenaming(null);
                          }}
                        />
                      ) : (
                        <div className={styles.iconName}>{item.name}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className={styles.listTable}>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("name")}>Name</th>
                    <th onClick={() => toggleSort("date")}>Date modified</th>
                    <th onClick={() => toggleSort("kind")}>Kind</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const key = itemKey(item.type, item.id);
                    const isOn = selected.has(key);
                    const isRenaming = renaming && renaming.type === item.type && String(renaming.id) === String(item.id);
                    return (
                      <tr
                        key={key}
                        className={`${styles.listRow} ${isOn ? styles.listRowSelected : ""}`}
                        onClick={(e) => { e.stopPropagation(); selectItem(item, e); }}
                        onDoubleClick={() => openItem(item)}
                        onContextMenu={(e) => showMenu(e, item.type, item)}
                        draggable
                        onDragStart={(e) => onItemDragStart(e, item)}
                        onDragOver={item.type === "folder" ? (e) => e.preventDefault() : undefined}
                        onDrop={item.type === "folder" ? (e) => onPaneDrop(e, item.id) : undefined}
                      >
                        <td>
                          <div className={styles.listName}>
                            {item.type === "folder" ? <IconFolder size={18} /> : <IconFile size={18} />}
                            {isRenaming ? (
                              <input
                                className={styles.listRename}
                                value={renameValue}
                                autoFocus
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={commitRename}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitRename();
                                  if (e.key === "Escape") setRenaming(null);
                                }}
                              />
                            ) : (
                              item.name
                            )}
                          </div>
                        </td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>{item.type === "folder" ? "Folder" : fileKind(item.name)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={styles.status}>
          <span>
            {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
            {selectedCount ? `  ·  ${selectedCount} selected` : ""}
          </span>
          <span>Drag files in to upload · F2 rename · Delete to remove</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        className={styles.hiddenInput}
        type="file"
        multiple
        onChange={(e) => {
          uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {contextMenu && (
        <div className={styles.menu} style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.type === "file" && (
            <>
              <a className={styles.menuLink} href={contextMenu.item.file_url} target="_blank" rel="noreferrer">Open</a>
              <button className={styles.menuItem} onClick={() => startRename(contextMenu.item)}>Rename</button>
              <button className={styles.menuItem} onClick={() => { navigator.clipboard.writeText(contextMenu.item.file_url); setContextMenu(null); }}>Copy link</button>
              <div className={styles.menuSep} />
              <button className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => deleteSelected([contextMenu.item])}>Delete</button>
            </>
          )}
          {contextMenu.type === "folder" && (
            <>
              <button className={styles.menuItem} onClick={() => { navigateToFolder(contextMenu.item.id); setContextMenu(null); }}>Open</button>
              <button className={styles.menuItem} onClick={() => startRename(contextMenu.item)}>Rename</button>
              <div className={styles.menuSep} />
              <button className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => deleteSelected([contextMenu.item])}>Delete</button>
            </>
          )}
          {contextMenu.type === "bg" && (
            <>
              <button className={styles.menuItem} onClick={() => { setContextMenu(null); createFolder(); }}>New Folder</button>
              <button className={styles.menuItem} onClick={() => { setContextMenu(null); fileInputRef.current?.click(); }}>Upload files…</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
