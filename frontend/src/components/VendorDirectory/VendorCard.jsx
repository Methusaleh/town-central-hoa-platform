import { Globe, Mail, Phone } from "lucide-react";
import { formatPhone, telHref, websiteHref, websiteLabel } from "./vendorLinks";
import styles from "./VendorCard.module.css";

export default function VendorCard({ vendor, actions, active, hideTag = false }) {
  const phone = telHref(vendor.contact_phone);
  const site = websiteHref(vendor.website_url);
  const hasContact = Boolean(vendor.contact_phone || vendor.contact_email || site);
  const showTag = Boolean(vendor.service_type) && !hideTag;

  return (
    <article className={`${styles.card} ${active ? styles.cardOn : ""}`}>
      <div className={styles.head}>
        {showTag && <em className={styles.tag}>{vendor.service_type}</em>}
        <h3>{vendor.company_name}</h3>
      </div>

      {hasContact && (
        <ul className={styles.contacts}>
          {vendor.contact_phone && (
            <li>
              <Phone size={15} aria-hidden="true" />
              {phone ? <a href={phone}>{formatPhone(vendor.contact_phone)}</a> : vendor.contact_phone}
            </li>
          )}
          {vendor.contact_email && (
            <li>
              <Mail size={15} aria-hidden="true" />
              <a href={`mailto:${vendor.contact_email}`}>{vendor.contact_email}</a>
            </li>
          )}
          {site && (
            <li>
              <Globe size={15} aria-hidden="true" />
              <a href={site} target="_blank" rel="noopener noreferrer">
                {websiteLabel(vendor.website_url)}
              </a>
            </li>
          )}
        </ul>
      )}

      {vendor.notes && <p className={styles.note}>{vendor.notes}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
}
