import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Check, ChevronDown, ChevronRight, ImagePlus, MapPin } from "lucide-react";
import Avatar from "../ui/Avatar";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { apiFetch } from "../../api";
import { PATHS } from "../../layout/navConfig";
import EventCreateModal from "./EventCreateModal";
import EventWash from "./EventWash";
import {
  coverFor,
  eventDateParts,
  formatEventDate,
  formatEventTime,
  googleCalendarUrl,
  isUpcoming,
  mapsUrl,
  openEventIcs,
  outlookCalendarUrl,
  typeMeta,
} from "./eventTypes";
import styles from "./Events.module.css";

function todayYmd() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function Fact({ label, children }) {
  if (!children) return null;
  return (
    <div className={styles.fact}>
      <p className={styles.factLabel}>{label}</p>
      <p className={styles.factBody}>{children}</p>
    </div>
  );
}

function AddToCalendar({ event }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className={styles.calWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.calBtn}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarPlus size={15} />
        Add to calendar
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className={styles.calMenu} role="menu">
          <a
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Google Calendar
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              openEventIcs(event);
              setOpen(false);
            }}
          >
            Apple Calendar
          </button>
          <a
            href={outlookCalendarUrl(event)}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Outlook
          </a>
        </div>
      )}
    </div>
  );
}

export default function Events({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [filter, setFilter] = useState("upcoming");
  const [rsvping, setRsvping] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photosRef = useRef(null);

  const isAdmin = user?.role === "board_member" || user?.role === "super_admin";
  const today = todayYmd();

  const loadList = async () => {
    try {
      const res = await apiFetch("/api/events");
      const data = await res.json();
      if (res.ok) setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Events fetch error:", err);
    } finally {
      setLoaded(true);
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await apiFetch(`/api/events/${id}`);
      const data = await res.json();
      if (res.ok) setDetail(data);
      else setDetail(null);
    } catch (err) {
      console.error("Event detail fetch error:", err);
      setDetail(null);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    setLoaded(false);
    if (eventId) loadDetail(eventId);
    else {
      setDetail(null);
      loadList();
    }
  }, [eventId]);

  const handleCancel = async () => {
    if (!detail || cancelling) return;
    setCancelling(true);
    try {
      const res = await apiFetch(`/api/events/${detail.id}/cancel`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDetail((current) =>
          current ? { ...current, cancelled_at: data.cancelled_at || current.cancelled_at } : current,
        );
        setShowCancel(false);
      }
    } catch (err) {
      console.error("Cancel event failed:", err);
    } finally {
      setCancelling(false);
    }
  };

  const handlePhotos = async (fileList) => {
    if (!detail || !fileList?.length || uploadingPhotos) return;
    setUploadingPhotos(true);
    setPhotoError("");
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append("photos", file));
      const res = await apiFetch(`/api/events/${detail.id}/photos`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDetail((current) =>
          current ? { ...current, gallery: data.gallery || current.gallery } : current,
        );
      } else {
        setPhotoError(data.error || "Couldn't add those photos.");
      }
    } catch {
      setPhotoError("Network error adding photos.");
    } finally {
      setUploadingPhotos(false);
      if (photosRef.current) photosRef.current.value = "";
    }
  };

  const handleRsvp = async () => {
    if (!detail || rsvping || detail.cancelled_at) return;
    setRsvping(true);
    setDetail((current) =>
      current
        ? {
            ...current,
            going: !current.going,
            rsvp_count: current.going
              ? Math.max(0, (current.rsvp_count || 0) - 1)
              : (current.rsvp_count || 0) + 1,
          }
        : current,
    );
    try {
      const res = await apiFetch(`/api/events/${detail.id}/rsvp`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        setDetail((current) =>
          current
            ? {
                ...current,
                going: data.going,
                rsvp_count: data.rsvp_count,
                rsvps: data.rsvps,
              }
            : current,
        );
      }
    } catch (err) {
      console.error("RSVP failed:", err);
      loadDetail(detail.id);
    } finally {
      setRsvping(false);
    }
  };

  if (eventId) {
    const event = detail;
    const meta = typeMeta(event?.event_type);
    const cover = coverFor(event);
    const facts = meta.fields
      .map((field) => ({ ...field, value: event?.details?.[field.key] }))
      .filter((field) => field.value);
    const rsvps = event?.rsvps || [];

    return (
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={() => navigate(PATHS.events)}>
          <ArrowLeft size={16} />
          All events
        </button>

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : !event ? (
          <div className={styles.empty}>
            That event isn't on the calendar anymore.
            <Link to={PATHS.events} className={styles.emptyLink}>
              Back to events
            </Link>
          </div>
        ) : (
          <article className={`${styles.detail} ${styles[`type_${event.event_type}`]}`}>
            {cover ? (
              <div className={styles.heroImg}>
                <img src={cover} alt="" />
              </div>
            ) : (
              <EventWash className={styles.heroWash} type={event.event_type} seed={event.id}>
                <p>{meta.kicker}</p>
                <span>{formatEventDate(event.event_date)}</span>
              </EventWash>
            )}

            <div className={styles.detailBody}>
              <p className={styles.kicker}>{meta.kicker}</p>
              {event.cancelled_at && (
                <p className={styles.cancelledBanner}>This event was cancelled.</p>
              )}
              <h2>{event.title}</h2>
              {isAdmin && (
                <div className={styles.boardActions}>
                  <Button variant="secondary" onClick={() => setShowEdit(true)}>
                    Edit
                  </Button>
                  {!event.cancelled_at && (
                    <Button variant="danger" onClick={() => setShowCancel(true)}>
                      Cancel event
                    </Button>
                  )}
                </div>
              )}
              <p className={styles.when}>
                {formatEventDate(event.event_date)}
                <span> · {formatEventTime(event.event_time)}</span>
              </p>
              {event.location && (
                <a
                  className={styles.place}
                  href={mapsUrl(event.location)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={15} />
                  {event.location}
                </a>
              )}

              {event.event_type === "meeting" ? (
                <div className={styles.meetingBlock}>
                  {event.details?.who && (
                    <p className={styles.whoLine}>For {event.details.who}</p>
                  )}
                  {event.details?.agenda && (
                    <div className={styles.agenda}>
                      <p className={styles.factLabel}>Agenda</p>
                      <pre>{event.details.agenda}</pre>
                    </div>
                  )}
                  {event.description && <p className={styles.story}>{event.description}</p>}
                </div>
              ) : (
                <>
                  {facts.length > 0 && (
                    <div className={styles.facts}>
                      {facts.map((field) => (
                        <Fact key={field.key} label={field.label}>
                          {field.value}
                        </Fact>
                      ))}
                    </div>
                  )}
                  {event.description && <p className={styles.story}>{event.description}</p>}
                </>
              )}

              <div className={styles.rsvpBox}>
                <div>
                  <strong>{event.rsvp_count || 0} going</strong>
                  <p>
                    {event.cancelled_at
                      ? "RSVPs are closed because this event was cancelled."
                      : rsvps.length
                        ? rsvps
                            .slice(0, 8)
                            .map((row) => row.display_name)
                            .join(", ") + (rsvps.length > 8 ? ` +${rsvps.length - 8} more` : "")
                        : "Be the first to say you'll be there."}
                  </p>
                </div>
                <div className={styles.rsvpPeople}>
                  {rsvps.slice(0, 5).map((row, i) => (
                    <Avatar key={`${row.display_name}-${i}`} name={row.display_name} photo={row.photo} size="sm" />
                  ))}
                </div>
                <Button
                  variant={event.going ? "secondary" : "primary"}
                  onClick={handleRsvp}
                  disabled={rsvping || Boolean(event.cancelled_at)}
                  aria-pressed={event.going}
                >
                  {event.going && <Check size={16} strokeWidth={2.5} aria-hidden />}
                  {event.cancelled_at ? "Cancelled" : event.going ? meta.rsvpDone : meta.rsvp}
                </Button>
              </div>

              <section className={styles.recap}>
                <div className={styles.recapHead}>
                  <h3>{isUpcoming(event, today) ? "Photos" : "Photos from the day"}</h3>
                  {isAdmin && (
                    <Button
                      variant="secondary"
                      onClick={() => photosRef.current?.click()}
                      disabled={uploadingPhotos}
                    >
                      <ImagePlus size={15} />
                      {uploadingPhotos ? "Adding…" : "Add photos"}
                    </Button>
                  )}
                </div>
                <input
                  ref={photosRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => handlePhotos(e.target.files)}
                />
                {photoError && <p className={styles.formError}>{photoError}</p>}
                {(event.gallery || []).length > 0 ? (
                  <div className={styles.gallery}>
                    {(event.gallery || []).map((photo, index) => (
                      <a
                        key={`${photo.url}-${index}`}
                        href={photo.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.galleryItem}
                      >
                        <img src={photo.url} alt={photo.name || "Event photo"} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className={styles.photoHint}>
                    {isUpcoming(event, today)
                      ? isAdmin
                        ? "After the event, add a recap dump here. Neighbors will see it on this page, including once it moves to Past."
                        : "Recap photos will show up here after the event."
                      : isAdmin
                        ? "Drop a recap dump for neighbors who missed it."
                        : "No recap photos yet."}
                  </p>
                )}
              </section>

              <div className={styles.detailLinks}>
                <AddToCalendar event={event} />
                {event.attachment_url && (
                  <a href={event.attachment_url} target="_blank" rel="noopener noreferrer">
                    Flyer / handout
                  </a>
                )}
              </div>
            </div>
          </article>
        )}

        {showEdit && event && (
          <EventCreateModal
            event={event}
            onClose={() => setShowEdit(false)}
            onSaved={() => loadDetail(event.id)}
          />
        )}
        {showCancel && event && (
          <Modal
            title="Cancel this event?"
            description="Neighbors will still see it, marked cancelled. RSVPs will close."
            onClose={() => setShowCancel(false)}
          >
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={() => setShowCancel(false)}>
                Keep it
              </Button>
              <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel event"}
              </Button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  const upcoming = events.filter((event) => isUpcoming(event, today));
  const past = events.filter((event) => !isUpcoming(event, today)).reverse();
  const shown = filter === "past" ? past : upcoming;

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Neighborhood</p>
          <h2>Events</h2>
          <p>What's coming up on the block — open one to see the details and say you're going.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>Create event</Button>
        )}
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={filter === "upcoming" ? styles.tabOn : styles.tab}
          onClick={() => setFilter("upcoming")}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          type="button"
          className={filter === "past" ? styles.tabOn : styles.tab}
          onClick={() => setFilter("past")}
        >
          Past ({past.length})
        </button>
      </div>

      {!loaded ? (
        <div className={styles.empty}>Loading…</div>
      ) : shown.length === 0 ? (
        <div className={styles.empty}>
          {filter === "past" ? "No past events yet." : "Nothing on the books. The calendar is wide open."}
        </div>
      ) : (
        <div className={styles.list}>
          {shown.map((event) => {
            const meta = typeMeta(event.event_type);
            const cover = coverFor(event);
            const parts = eventDateParts(event.event_date);
            return (
              <Link
                key={event.id}
                to={`${PATHS.events}/${event.id}`}
                className={`${styles.card} ${styles[`type_${event.event_type}`]}`}
              >
                {cover ? (
                  <img src={cover} alt="" className={styles.cardCover} />
                ) : (
                  <EventWash className={styles.cardBand} type={event.event_type} seed={event.id}>
                    {meta.kicker}
                  </EventWash>
                )}
                <div className={styles.cardBody}>
                  <div className={styles.dateBlock} aria-hidden="true">
                    <span>{parts.month}</span>
                    <strong>{parts.day}</strong>
                    <em>{parts.weekday}</em>
                  </div>
                  <div className={styles.cardCopy}>
                    <p className={styles.cardKicker}>
                      {meta.label}
                      {event.cancelled_at ? " · Cancelled" : ""}
                    </p>
                    <h3>{event.title}</h3>
                    <p>
                      {formatEventTime(event.event_time)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    <span className={styles.goingCount}>
                      {event.cancelled_at
                        ? "Cancelled"
                        : event.rsvp_count
                          ? `${event.rsvp_count} going`
                          : "No RSVPs yet"}
                      {!event.cancelled_at && event.going ? " · you're in" : ""}
                      {(event.gallery || []).length
                        ? ` · ${event.gallery.length} photo${event.gallery.length === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </div>
                  <ChevronRight size={16} className={styles.chevron} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <EventCreateModal
          onClose={() => setShowCreate(false)}
          onSaved={(created) => {
            loadList();
            if (created?.id) navigate(`${PATHS.events}/${created.id}`);
          }}
        />
      )}
    </div>
  );
}
